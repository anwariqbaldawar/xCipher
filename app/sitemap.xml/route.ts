import { dbRead } from "@/lib/db";
import { article as articleTable } from "@/lib/db/schema";
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

export const revalidate = 3600;

const SITEMAP_ARTICLE_LIMIT = 45000;

export async function GET() {
  const base = siteConfig.url;
  let totalArticles = 0;
  let latestUpdate = new Date("2026-10-01T00:00:00.000Z");

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
    totalArticles = countRes[0]?.count || 0;
    if (latestRes[0]?.updatedAt) {
      latestUpdate = latestRes[0].updatedAt;
    }
  } catch {
    // Fallback to single page sitemap entry if DB is unreachable
  }

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
