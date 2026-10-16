import { unstable_cache } from "next/cache";
import { dbRead } from "@/lib/db";
import { article as articleTable } from "@/lib/db/schema";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { siteConfig } from "@/lib/seo";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap index.
//
// /sitemap.xml is now an index pointing at child sitemaps:
//   /sitemap/pages.xml    — regular sitemap (static pages, categories, authors,
//                           published articles; paginated at 45k URLs/page)
//   /sitemap/articles.xml — Google News sitemap (articles from the last 48h,
//                           with the <news:news> namespace Google requires)
// ─────────────────────────────────────────────────────────────────────────────

// Cached rather than force-dynamic. A sitemap index is fetched by every search
// engine on its own schedule and links nowhere a reader goes, so this route used
// to be a pure cost centre: two queries (a count and a max(updatedAt) over the
// whole article table) per bot per crawl. The reads are now a 24-hour data-cache
// entry tagged `articles`, and the response itself revalidates hourly.
//
// The whole document still has to re-render before the tag can drop it — publish
// and delete both call `revalidatePath("/sitemap.xml")` (SYNDICATION_PATHS in
// lib/article-deletion.ts), so a new story appears in the index on the next
// crawl after it goes live, not an hour later.
export const revalidate = 3600;

const SITEMAP_ARTICLE_LIMIT = 45000;

/** Count + newest-updated stamp for the index. One cached entry, tagged. */
const getSitemapIndexCounts = unstable_cache(
  async () => {
    try {
      const [countRes, latestRes] = await Promise.all([
        dbRead
          .select({ count: sql<number>`count(*)::int` })
          .from(articleTable)
          .where(sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"`),
        dbRead.query.article.findMany({
          where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"`,
          columns: { updatedAt: true },
          orderBy: (a, { desc }) => [desc(a.updatedAt)],
          limit: 1,
        }),
      ]);
      const updatedAt = latestRes[0]?.updatedAt;
      return {
        totalArticles: countRes[0]?.count || 0,
        latestUpdate: updatedAt ? new Date(updatedAt).toISOString() : new Date("2026-10-01T00:00:00.000Z").toISOString(),
      };
    } catch {
      // Fallback to a single-page sitemap entry when the database is unreachable.
      // Cached on purpose: an unreachable database must not be re-probed by every
      // crawler request for an hour.
      return { totalArticles: 0, latestUpdate: new Date("2026-10-01T00:00:00.000Z").toISOString() };
    }
  },
  ["sitemap-index-counts-v1"],
  { tags: [CACHE_TAGS.articles], revalidate: 86400 },
);

export async function GET() {
  const base = siteConfig.url;
  const { totalArticles, latestUpdate: latestUpdateIso } = await getSitemapIndexCounts();
  const latestUpdate = new Date(latestUpdateIso);

  const pageCount = Math.max(1, Math.ceil(totalArticles / SITEMAP_ARTICLE_LIMIT));
  const lastmod = latestUpdate.toISOString();

  const pageSitemaps = Array.from({ length: pageCount }, (_, i) => {
    const pageNum = i + 1;
    const loc = pageNum === 1 ? `${base}/sitemap/pages.xml` : `${base}/sitemap/pages.xml?page=${pageNum}`;
    return `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pageSitemaps}
  <sitemap>
    <loc>${base}/sitemap/articles.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
