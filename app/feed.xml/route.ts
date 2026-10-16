import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { siteConfig } from "@/lib/seo";
import { getArticleAuthor } from "@/lib/personas";
import { and, eq, lte } from "drizzle-orm";
import { article as articleTable } from "@/lib/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// RSS feed.
//
// The route was already cached for an hour (`revalidate = 3600`), but the query
// behind it was not: every revalidation — and every one of the twenty-ish
// revalidations a busy publishing day triggers through SYNDICATION_PATHS — re-read
// twenty articles from Neon. The feed readers themselves are the other half of
// the problem: RSS clients poll on their own schedule regardless of traffic.
//
// The list is now a tagged data-cache entry. Publishing, editing, unpublishing or
// deleting a story invalidates `articles`, which drops this entry *and* the route
// output in the same action, so the feed still reflects a publish immediately.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600;

const FEED_ITEM_LIMIT = 20;

/**
 * The twenty newest published stories, in the shape the XML below renders.
 *
 * Dates are normalized to ISO strings inside the cache (the data cache stores
 * JSON, so a `Date` would round-trip to a string anyway — doing it here makes the
 * two paths identical), and `textContent` is excluded: it is the largest column
 * on the table and no feed field reads it.
 */
const getFeedArticles = unstable_cache(
  async () => {
    const articles = await db.query.article.findMany({
      where: and(
        eq(articleTable.status, "PUBLISHED"),
        lte(articleTable.publishedAt, new Date()),
      ),
      orderBy: (a, { desc }) => [desc(a.publishedAt)],
      limit: FEED_ITEM_LIMIT,
      columns: { textContent: false },
      with: {
        authorModel: true,
        category: { with: { parent: true } },
      },
    });

    return articles.map(article => ({
      slug: article.slug,
      title: article.title,
      deck: article.deck,
      // `getArticleAuthor` resolves the editorial persona for an anonymized
      // story, so the feed never carries a real byline for one.
      authorName: getArticleAuthor(article).name,
      publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : null,
      createdAt: new Date(article.createdAt).toISOString(),
    }));
  },
  ["rss-feed-v1"],
  { tags: [CACHE_TAGS.articles], revalidate: 86400 },
);

export async function GET() {
  try {
    const articles = await getFeedArticles();

    const siteUrl = siteConfig.url;

    const escapeXml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const rssItems = articles
      .map((article) => {
        const url = escapeXml(`${siteUrl}/article/${article.slug}`);
        const title = escapeXml(article.title);
        const description = escapeXml(article.deck || "");
        const pubDate = new Date(article.publishedAt || article.createdAt).toUTCString();
        const author = escapeXml(article.authorName);

        return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      <author>${author}</author>
    </item>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteConfig.name} — ${escapeXml(siteConfig.tagline)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new Response("Error generating feed", { status: 500 });
  }
}
