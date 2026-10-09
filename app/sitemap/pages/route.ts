import { dbRead } from "@/lib/db";
import { siteConfig } from "@/lib/seo";
import { sql } from "drizzle-orm";
import { article as articleTable, tag as tagTable, _articleToTag } from "@/lib/db/schema";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Regular sitemap: static pages, categories, tags, authors and published
// articles. Reads go to the read replica when DATABASE_URL_REPLICA is set.
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

export async function GET(request?: NextRequest) {
  const requestedPage = Number(request?.nextUrl?.searchParams.get("page") || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (page - 1) * SITEMAP_ARTICLE_LIMIT;

  let articles: { slug: string; updatedAt: Date | null }[] = [];
  let categories: { slug: string }[] = [];
  let authors: { slug: string }[] = [];
  let tags: { slug: string }[] = [];

  try {
    [articles, categories, authors, tags] = await Promise.all([
      dbRead.query.article.findMany({
        where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"`,
        columns: { slug: true, updatedAt: true },
        orderBy: (article, { desc }) => [desc(article.publishedAt)],
        offset,
        limit: SITEMAP_ARTICLE_LIMIT,
      }),
      page === 1 ? dbRead.query.category.findMany({ columns: { slug: true }, limit: 1000 }) : Promise.resolve([]),
      page === 1 ? dbRead.query.author.findMany({ columns: { slug: true }, limit: 1000 }) : Promise.resolve([]),
      page === 1
        ? dbRead
            .select({ slug: tagTable.slug })
            .from(tagTable)
            .where(
              sql`(SELECT count(*) FROM "_ArticleToTag" JOIN "Article" ON "Article"."id" = "_ArticleToTag"."A" WHERE "_ArticleToTag"."B" = ${tagTable.id} AND "Article"."status" = 'PUBLISHED'::"ArticleStatus") >= 3`,
            )
            .limit(2000)
        : Promise.resolve([]),
    ]);
  } catch (error) {
    console.warn("[sitemap] Failed to fetch dynamic entries from DB:", error);
  }

  const latestUpdateIso = (articles[0]?.updatedAt || new Date("2026-10-01T00:00:00.000Z")).toISOString();
  const urls: string[] = [
    ...(page === 1
      ? STATIC_PUBLIC_PATHS.map(
          (item) =>
            `<url><loc>${siteConfig.url}${item.path}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`,
        )
      : []),
    ...articles.map(
      (a) =>
        `<url><loc>${siteConfig.url}/article/${escapeXml(a.slug)}</loc><lastmod>${(a.updatedAt || new Date("2026-10-01T00:00:00.000Z")).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    ),
    ...categories.map(
      (c) =>
        `<url><loc>${siteConfig.url}/category/${escapeXml(c.slug)}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
    ),
    ...tags.map(
      (t) =>
        `<url><loc>${siteConfig.url}/tag/${escapeXml(t.slug)}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`,
    ),
    ...authors.map(
      (a) =>
        `<url><loc>${siteConfig.url}/author/${escapeXml(a.slug)}</loc><lastmod>${latestUpdateIso}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`,
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
