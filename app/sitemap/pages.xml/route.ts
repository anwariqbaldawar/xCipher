import { unstable_cache } from "next/cache";
import { dbRead } from "@/lib/db";
import { article as articleTable, tag as tagTable, category as categoryTable, author as authorTable } from "@/lib/db/schema";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { articleFeaturedCrawlerUrl, siteConfig } from "@/lib/seo";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Regular sitemap: static pages, categories, tags, authors and published
// articles. Reads go to the read replica when DATABASE_URL_REPLICA is set.
//
// FINDING CRW-001 FIX (audit 2026-10-13):
//  1. Pehle saari queries ek hi Promise.all mein theen — ek bhi query fail hoti
//     to poora dynamic section chup-chaap khaali reh jaata tha (live sitemap
//     mein sirf 19 static URLs, lastmod hardcoded fallback par).
//  2. Authors query legacy table "_ArticleToAuthor" use karti thi jo Drizzle
//     schema mein exist nahi karti (Prisma migration leftover) — [Likely] yehi
//     batch fail karwa rahi thi.
// Ab: har query ka apna try/catch (partial success), authors = Article.authorId
// se, aur failure par loud warn taake monitoring alert kar sake.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600;

const SITEMAP_ARTICLE_LIMIT = 45000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STATIC_PUBLIC_PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "", changefreq: "hourly", priority: "1.0" },
  { path: "/latest", changefreq: "hourly", priority: "0.9" },
  { path: "/series", changefreq: "weekly", priority: "0.7" },
  { path: "/page/about", changefreq: "monthly", priority: "0.7" },
  { path: "/page/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/page/newsletters", changefreq: "monthly", priority: "0.7" },
  { path: "/page/advertising", changefreq: "monthly", priority: "0.6" },
  { path: "/page/media-kit", changefreq: "monthly", priority: "0.6" },
  { path: "/page/careers", changefreq: "monthly", priority: "0.6" },
  { path: "/page/editorial-policy", changefreq: "monthly", priority: "0.6" },
  { path: "/page/editorial-standards", changefreq: "monthly", priority: "0.6" },
  { path: "/page/corrections", changefreq: "monthly", priority: "0.6" },
  { path: "/page/transparency", changefreq: "monthly", priority: "0.6" },
  { path: "/page/accessibility", changefreq: "yearly", priority: "0.5" },
  { path: "/page/privacy-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/page/terms-of-use", changefreq: "yearly", priority: "0.4" },
  { path: "/page/cookie-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/page/disclaimer", changefreq: "yearly", priority: "0.4" },
  { path: "/page/sitemap", changefreq: "weekly", priority: "0.4" },
];

async function safely<T>(label: string, query: Promise<T>): Promise<T | null> {
  try {
    return await query;
  } catch (error) {
    // Loud, greppable warning: monitoring (Sentry consoleLoggingIntegration)
    // ya server-log grep isi line ko pakdega.
    console.error(`[sitemap] FAILED query group "${label}" — partial sitemap served:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The four query groups are cached per page.
//
// This document is the one crawlers fetch most often and the one nobody reads:
// it lists up to 45,000 article URLs, plus the sections, tags and authors that
// have published work. It ran four queries — including two `EXISTS`/`count(*)`
// subqueries over the join tables — on every single request, and the route's own
// `revalidate = 3600` did not help because the handler read the database each
// time it ran.
//
// CACHING IS SKIPPED FOR A PARTIAL READ. The CRW-001 fix in this file made each
// group fail independently so one bad query cannot empty the whole sitemap. That
// behaviour is kept *and* protected from the cache: if any group failed, the
// loader throws, `unstable_cache` stores nothing, and the caller re-reads without
// the cache to serve the partial document. A transient database blip can
// therefore never be frozen into an hour (or a day) of a truncated sitemap.
// ─────────────────────────────────────────────────────────────────────────────

interface SitemapPageData {
  articles: { slug: string; title: string; img: string | null; featuredImageCaption: string | null; updatedAt: string }[];
  categories: { slug: string }[];
  authors: { slug: string }[];
  tags: { slug: string }[];
  complete: boolean;
}

async function fetchSitemapPageData(page: number, offset: number): Promise<SitemapPageData> {
  const [articles, categories, authors, tags] = await Promise.all([
    safely(
      "articles",
      dbRead.query.article.findMany({
        // PUBLISHED *and* due. An article scheduled for a future date carries
        // the PUBLISHED status while `publishedAt` is still ahead of now (that
        // is how the scheduler finds it), and listing it here publishes a URL
        // that the article route answers with a 404 — the fastest way to get a
        // sitemap full of soft errors.
        where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"
          AND (${articleTable.publishedAt} IS NULL OR ${articleTable.publishedAt} <= NOW())`,
        // `img` feeds the <image:image> extension below. Nothing else on this
        // page is allowed to emit an image: category, tag and author URLs are
        // listed without one so Google Images binds each featured image to its
        // article and to nothing else.
        columns: { slug: true, title: true, img: true, featuredImageCaption: true, updatedAt: true },
        orderBy: (article, { desc }) => [desc(article.publishedAt)],
        offset,
        limit: SITEMAP_ARTICLE_LIMIT,
      }),
    ),
    page === 1
      ? safely(
          "categories",
          dbRead
            .select({ slug: categoryTable.slug })
            .from(categoryTable)
            .where(
              sql`"Category"."parentId" IS NULL AND "Category"."slug" !~ '\\s' AND EXISTS (
                SELECT 1 FROM "Article" a WHERE a."categoryId" = "Category"."id" AND a."status" = 'PUBLISHED' AND (a."publishedAt" IS NULL OR a."publishedAt" <= NOW())
                UNION ALL
                SELECT 1 FROM "Article" a JOIN "Category" sub ON a."categoryId" = sub."id" WHERE sub."parentId" = "Category"."id" AND a."status" = 'PUBLISHED' AND (a."publishedAt" IS NULL OR a."publishedAt" <= NOW())
              )`,
            )
            .limit(1000),
        )
      : Promise.resolve([]),
    page === 1
      ? safely(
          // FIX: legacy Prisma table "_ArticleToAuthor" ki jagah Article.authorId
          // (Drizzle schema ki actual linkage).
          "authors",
          dbRead
            .select({ slug: authorTable.slug })
            .from(authorTable)
            .where(
              sql`EXISTS (
                SELECT 1 FROM "Article" a
                WHERE a."authorId" = "Author"."id"
                  AND a."status" = 'PUBLISHED'
                  AND a."isAnonymous" = false
                  AND (a."publishedAt" IS NULL OR a."publishedAt" <= NOW())
              )`,
            )
            .limit(1000),
        )
      : Promise.resolve([]),
    page === 1
      ? safely(
          "tags",
          dbRead
            .select({ slug: tagTable.slug })
            .from(tagTable)
            .where(
              sql`(SELECT count(*) FROM "_ArticleToTag" JOIN "Article" ON "Article"."id" = "_ArticleToTag"."A" WHERE "_ArticleToTag"."B" = ${tagTable.id} AND "Article"."status" = 'PUBLISHED'::"ArticleStatus" AND ("Article"."publishedAt" IS NULL OR "Article"."publishedAt" <= NOW())) >= 3 AND ${tagTable.slug} !~ '\\s'`,
            )
            .limit(2000),
        )
      : Promise.resolve([]),
  ]);

  return {
    // `updatedAt` is normalized to an ISO string here, at the cache boundary:
    // the data cache round-trips through JSON, so a `Date` would come back as a
    // string on a hit and a `Date` on a miss. One shape, always.
    articles: (articles ?? []).map(row => ({
      slug: row.slug,
      title: row.title,
      img: row.img,
      featuredImageCaption: row.featuredImageCaption,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : "",
    })),
    categories: categories ?? [],
    authors: authors ?? [],
    tags: tags ?? [],
    complete: Boolean(articles && categories && authors && tags),
  };
}

/** Cached read. Throws instead of caching a partial document — see above. */
function getCachedSitemapPageData(page: number, offset: number) {
  return unstable_cache(
    async () => {
      const data = await fetchSitemapPageData(page, offset);
      if (!data.complete) {
        throw new Error(`[sitemap] partial read for page ${page} — not cached`);
      }
      return data;
    },
    ["sitemap-page-v1", String(page)],
    { tags: [CACHE_TAGS.articles, CACHE_TAGS.taxonomy, CACHE_TAGS.authors], revalidate: 86400 },
  )();
}

async function loadSitemapPageData(page: number, offset: number): Promise<SitemapPageData> {
  try {
    return await getCachedSitemapPageData(page, offset);
  } catch (error) {
    // Either a partial read (never cached, by design) or an unusable cache.
    // Serving the partial document is the intended behaviour here — the warning
    // above already fired with the failing query group.
    console.warn("[sitemap] serving an uncached page read:", error);
    return fetchSitemapPageData(page, offset);
  }
}

// The request parameter is required, not optional.
//
// Next 16 generates a type check for every route handler and rejects an
// optional first parameter (`request?: NextRequest` is not assignable to
// `NextRequest | Request`), which fails `next build` outright. Next always
// supplies a request to a route handler, so the optional form bought nothing
// and cost the build.
export async function GET(request: NextRequest) {
  const requestedPage = Number(request.nextUrl.searchParams.get("page") || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (page - 1) * SITEMAP_ARTICLE_LIMIT;

  const { articles: articleRows, categories: categoryRows, authors: authorRows, tags: tagRows } =
    await loadSitemapPageData(page, offset);

  const latestUpdateIso = articleRows[0]?.updatedAt || new Date("2026-10-01T00:00:00.000Z").toISOString();
  const urls: string[] = [
    ...(page === 1
      ? STATIC_PUBLIC_PATHS.map(
          (item) =>
            `<url><loc>${siteConfig.url}${item.path}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`,
        )
      : []),
    ...articleRows.map((a) => {
      const featured = articleFeaturedCrawlerUrl(a);
      return `<url><loc>${siteConfig.url}/article/${escapeXml(a.slug)}</loc><lastmod>${a.updatedAt || new Date("2026-10-01T00:00:00.000Z").toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority>${
        featured
          ? `<image:image><image:loc>${escapeXml(featured)}</image:loc><image:title>${escapeXml(a.title)}</image:title><image:caption>${escapeXml(a.featuredImageCaption?.trim() || a.title)}</image:caption></image:image>`
          : ""
      }</url>`;
    }),
    ...categoryRows.map(
      (c) =>
        `<url><loc>${siteConfig.url}/category/${escapeXml(c.slug)}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
    ),
    ...tagRows.map(
      (t) =>
        `<url><loc>${siteConfig.url}/tag/${escapeXml(t.slug)}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`,
    ),
    ...authorRows.map(
      (a) =>
        `<url><loc>${siteConfig.url}/author/${escapeXml(a.slug)}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`,
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
