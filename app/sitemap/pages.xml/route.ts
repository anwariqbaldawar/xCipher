import { dbRead } from "@/lib/db";
import { article as articleTable, tag as tagTable, category as categoryTable, author as authorTable } from "@/lib/db/schema";
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

export async function GET(request?: NextRequest) {
  const requestedPage = Number(request?.nextUrl?.searchParams.get("page") || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (page - 1) * SITEMAP_ARTICLE_LIMIT;

  const [articles, categories, authors, tags] = await Promise.all([
    safely(
      "articles",
      dbRead.query.article.findMany({
        where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"`,
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
                SELECT 1 FROM "Article" a WHERE a."categoryId" = "Category"."id" AND a."status" = 'PUBLISHED'
                UNION ALL
                SELECT 1 FROM "Article" a JOIN "Category" sub ON a."categoryId" = sub."id" WHERE sub."parentId" = "Category"."id" AND a."status" = 'PUBLISHED'
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
              sql`(SELECT count(*) FROM "_ArticleToTag" JOIN "Article" ON "Article"."id" = "_ArticleToTag"."A" WHERE "_ArticleToTag"."B" = ${tagTable.id} AND "Article"."status" = 'PUBLISHED'::"ArticleStatus") >= 3 AND ${tagTable.slug} !~ '\\s'`,
            )
            .limit(2000),
        )
      : Promise.resolve([]),
  ]);

  const articleRows = articles ?? [];
  const categoryRows = categories ?? [];
  const authorRows = authors ?? [];
  const tagRows = tags ?? [];

  const latestUpdateIso = (articleRows[0]?.updatedAt || new Date("2026-10-01T00:00:00.000Z")).toISOString();
  const urls: string[] = [
    ...(page === 1
      ? STATIC_PUBLIC_PATHS.map(
          (item) =>
            `<url><loc>${siteConfig.url}${item.path}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`,
        )
      : []),
    ...articleRows.map((a) => {
      const featured = articleFeaturedCrawlerUrl(a);
      return `<url><loc>${siteConfig.url}/article/${escapeXml(a.slug)}</loc><lastmod>${(a.updatedAt || new Date("2026-10-01T00:00:00.000Z")).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority>${
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
