import { unstable_cache } from "next/cache";
import { dbRead } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache-tags";
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

// Cached like the rest of the syndication surface. The 48-hour window is a
// sliding one, so this document genuinely cannot be cached for a day — but it
// also cannot be re-queried per crawl. A one-hour data cache plus a one-hour
// route window, invalidated by tag on every publish, is the compromise: a story
// that goes live is in the news sitemap immediately (the publish action
// revalidates `articles` and this path), and a crawl every few minutes costs one
// cache read.
export const revalidate = 3600;

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
  publishedAt: string | null;
  updatedAt: string | null;
};

/**
 * The last 48 hours of publishable news, with the newsless-archive fallback.
 *
 * Deliberately without a try/catch: a failed read must escape, because
 * `unstable_cache` stores only what the function returns and an empty news
 * sitemap frozen for an hour is a worse outcome than one uncached request. The
 * caller below turns the failure into the empty `<urlset>` this document has
 * always fallen back to — just without caching it.
 */
const getNewsSitemapArticles = unstable_cache(
  async (): Promise<NewsArticleRow[]> => {
    let articles = await dbRead.query.article.findMany({
      // `<= NOW()` as well as the 48-hour window: a scheduled article already
      // holds the PUBLISHED status, so without the upper bound a story that is
      // not live yet would be submitted to Google News as news.
      where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"
        AND ${articleTable.publishedAt} IS NOT NULL
        AND ${articleTable.publishedAt} >= NOW() - INTERVAL '48 HOURS'
        AND ${articleTable.publishedAt} <= NOW()`,
      columns: { slug: true, title: true, img: true, featuredImageCaption: true, publishedAt: true, updatedAt: true },
      orderBy: (article, { desc }) => [desc(article.publishedAt)],
      limit: NEWS_SITEMAP_LIMIT,
    });

    // Fallback: Agar pichle 48h mein koi article na ho, to latest published
    // articles include karein taake Google Search Console ko empty <urlset>
    // ka "Missing XML tag: url" error na mile.
    if (!articles.length) {
      articles = await dbRead.query.article.findMany({
        where: sql`${articleTable.status} = 'PUBLISHED'::"ArticleStatus"
          AND (${articleTable.publishedAt} IS NULL OR ${articleTable.publishedAt} <= NOW())`,
        columns: { slug: true, title: true, img: true, featuredImageCaption: true, publishedAt: true, updatedAt: true },
        orderBy: (article, { desc }) => [desc(article.publishedAt)],
        limit: 10,
      });
    }

    return articles.map(row => ({
      slug: row.slug,
      title: row.title,
      img: row.img,
      featuredImageCaption: row.featuredImageCaption,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    }));
  },
  ["news-sitemap-v1"],
  { tags: [CACHE_TAGS.articles], revalidate: 3600 },
);

/** Cached read, with the "database blipped" path kept out of the cache. */
async function loadNewsSitemapArticles(): Promise<NewsArticleRow[]> {
  try {
    return await getNewsSitemapArticles();
  } catch (error) {
    console.warn("[sitemap] News sitemap query failed:", error);
    return [];
  }
}

export async function GET() {
  const articles = await loadNewsSitemapArticles();

  const urls = articles.map((a) => {
    const date = new Date(a.publishedAt || a.updatedAt || Date.now()).toISOString();
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
