import { dbRead } from "@/lib/db";
import { siteConfig } from "@/lib/seo";
import { sql } from "drizzle-orm";
import { article as articleTable } from "@/lib/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Regular sitemap: static pages, categories, authors and all published
// articles. Reads go to the read replica when DATABASE_URL_REPLICA is set.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  let articles: { slug: string; updatedAt: Date | null }[] = [];
  let categories: { slug: string }[] = [];
  let authors: { slug: string }[] = [];

  try {
    [articles, categories, authors] = await Promise.all([
      dbRead.query.article.findMany({
        where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"`,
        columns: { slug: true, updatedAt: true },
        orderBy: (article, { desc }) => [desc(article.publishedAt)],
        limit: 5000,
      }),
      dbRead.query.category.findMany({ columns: { slug: true }, limit: 1000 }),
      dbRead.query.author.findMany({ columns: { slug: true }, limit: 1000 }),
    ]);
  } catch (error) {
    console.warn("[sitemap] Failed to fetch dynamic entries from DB:", error);
  }

  const now = new Date().toISOString();
  const urls: string[] = [
    `<url><loc>${siteConfig.url}</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${siteConfig.url}/page/about</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    `<url><loc>${siteConfig.url}/page/contact</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    `<url><loc>${siteConfig.url}/page/newsletters</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    `<url><loc>${siteConfig.url}/series</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ...articles.map(
      (a) =>
        `<url><loc>${siteConfig.url}/article/${escapeXml(a.slug)}</loc><lastmod>${(a.updatedAt || new Date()).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    ),
    ...categories.map(
      (c) =>
        `<url><loc>${siteConfig.url}/category/${escapeXml(c.slug)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
    ),
    ...authors.map(
      (a) =>
        `<url><loc>${siteConfig.url}/author/${escapeXml(a.slug)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`,
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
