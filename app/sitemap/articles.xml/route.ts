import { dbRead } from "@/lib/db";
import { articleFeaturedCrawlerUrl, siteConfig } from "@/lib/seo";
import { sql } from "drizzle-orm";
import { article as articleTable } from "@/lib/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Google News sitemap: only articles published in the last 48 hours (Google's
// requirement), max 1000 entries, with the <news:news> namespace carrying the
// publication name, language, publication date and title.
//
// Submit this URL in Google Search Console → Sitemaps (and add the site to
// Google News Publisher Center) for Google News eligibility.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

const NEWS_SITEMAP_LIMIT = 1000;
const PUBLICATION_NAME = "xSypher";
const PUBLICATION_LANGUAGE = "en";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type NewsArticleRow = {
  slug: string;
  title: string;
  img: string | null;
  featuredImageCaption: string | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
};

export async function GET() {
  let articles: NewsArticleRow[] = [];

  try {
    articles = await dbRead.query.article.findMany({
      where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"
        AND ${articleTable.publishedAt} IS NOT NULL
        AND ${articleTable.publishedAt} >= NOW() - INTERVAL '48 HOURS'`,
      columns: { slug: true, title: true, img: true, featuredImageCaption: true, publishedAt: true, updatedAt: true },
      orderBy: (article, { desc }) => [desc(article.publishedAt)],
      limit: NEWS_SITEMAP_LIMIT,
    });

    // Fallback: Agar pichle 48h mein koi article na ho, to latest published
    // articles include karein taake Google Search Console ko empty <urlset>
    // ka "Missing XML tag: url" error na mile.
    if (!articles.length) {
      articles = await dbRead.query.article.findMany({
        where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"`,
        columns: { slug: true, title: true, img: true, featuredImageCaption: true, publishedAt: true, updatedAt: true },
        orderBy: (article, { desc }) => [desc(article.publishedAt)],
        limit: 10,
      });
    }
  } catch (error) {
    console.warn("[sitemap] News sitemap query failed:", error);
  }

  const urls = articles.map((a) => {
    const date = (a.publishedAt || a.updatedAt || new Date()).toISOString();
    const featured = articleFeaturedCrawlerUrl(a);
    return [
      "  <url>",
      `    <loc>${siteConfig.url}/article/${escapeXml(a.slug)}</loc>`,
      // Image extension: one image, the featured one, bound to this article's
      // canonical URL. Google Images treats this as the authoritative pairing
      // and stops inferring the association from whichever archive page also
      // happens to render the same photograph.
      ...(featured
        ? [
            "    <image:image>",
            `      <image:loc>${escapeXml(featured)}</image:loc>`,
            `      <image:title>${escapeXml(a.title)}</image:title>`,
            `      <image:caption>${escapeXml(a.featuredImageCaption?.trim() || a.title)}</image:caption>`,
            "    </image:image>",
          ]
        : []),
      "    <news:news>",
      "      <news:publication>",
      `        <news:name>${PUBLICATION_NAME}</news:name>`,
      `        <news:language>${PUBLICATION_LANGUAGE}</news:language>`,
      "      </news:publication>",
      `      <news:publication_date>${date}</news:publication_date>`,
      `      <news:title>${escapeXml(a.title)}</news:title>`,
      "    </news:news>",
      "  </url>",
    ].join("\n");
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
