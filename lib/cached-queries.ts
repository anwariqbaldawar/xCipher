import { unstable_cache } from "next/cache";
// Read-only cached listings — served from the read replica when configured.
import { dbRead as db } from "./db";
import { CACHE_TAGS, categoryTag, authorTag, tagTag } from "./cache-tags";
import { publicFeedWhere, queryPublicFeed } from "./feed";
import { getArticleAuthor, maskPublicArticle } from "./personas";
import { buildArticleScope, type Actor } from "./capabilities";
import { eq, and, or, ne, lte, isNull, inArray, notInArray, sql } from "drizzle-orm";
import { article as articleTable, benchmarkLeaderboard } from "@/lib/db/schema";
import {
  ARTICLE_CARD_COLUMNS,
  ARTICLE_CARD_WITH,
  HOME_ARTICLE_LIMIT,
  LATEST_ARTICLE_LIMIT,
  LISTING_ARTICLE_LIMIT,
} from "./queries";
import { resolveIndexImage, type SearchIndexEntry, type SearchIndexPayload } from "./search-index";

// ─────────────────────────────────────────────────────────────────────────────
// Tagged reads for public article listings
// ─────────────────────────────────────────────────────────────────────────────
//
// These wrap the listing queries in unstable_cache so their results can be
// invalidated by tag rather than by path.
//
// The reason is what the alternative costs. Publishing one article used to call
// revalidatePath("/", "layout"), which drops the cached output of every route
// under the root layout -- homepage, /latest, every category, every tag, every
// author page, every article. The next visitor to each of those pays a full
// re-render and a fresh round of queries. On a publication that ships several
// stories an hour, the cache is almost never warm.
//
// With tags, publishing invalidates `articles` and the specific category and
// author involved. Everything else stays warm.
//
// unstable_cache rather than the newer `cacheTag`: that one requires the
// experimental dynamicIO flag, which is not enabled here and would change the
// rendering model for the whole app. The "unstable" prefix is unfortunate but
// the API has been stable in practice across the 14/15/16 line, and it is what
// works with this configuration today.
//
// Note these cache the *query result*, which is a separate layer from the
// route-level `export const revalidate`. A page can therefore re-render (for
// example because a different tag was invalidated) and still reuse these rows
// without touching Postgres.
// ─────────────────────────────────────────────────────────────────────────────

/** Articles for the homepage, newest first. */
export const getHomeArticles = unstable_cache(
  async () => {
    try {
      const articles = await db.query.article.findMany({
        where: and(eq(articleTable.status, "PUBLISHED"), or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date()))),
        orderBy: (a, { desc }) => [desc(a.publishedAt)],
        limit: HOME_ARTICLE_LIMIT,
        columns: ARTICLE_CARD_COLUMNS,
        with: ARTICLE_CARD_WITH,
      });
      return articles.map(maskPublicArticle);
    } catch (error) {
      console.warn("[cached-queries] Failed to fetch home articles:", error);
      return [];
    }
  },
  // Key parts. These queries take no arguments, so a static key is correct --
  // but it must still be distinct per query or two different listings would
  // share one cache entry.
  ["home-articles"],
  { tags: [CACHE_TAGS.articles, CACHE_TAGS.homepage], revalidate: 300 }
);

/** Featured stories can be older than the bounded home listing. */
export const getHomeHeroArticle = unstable_cache(
  async () => {
    const [hero] = await db.query.article.findMany({
      where: and(
        eq(articleTable.status, "PUBLISHED"),
        or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date())),
        or(eq(articleTable.featured, true), eq(articleTable.homepagePlacement, "featured")),
      ),
      orderBy: (a, { desc }) => [desc(a.publishedAt)],
      limit: 1,
      columns: ARTICLE_CARD_COLUMNS,
      with: ARTICLE_CARD_WITH,
    });
    return hero ? maskPublicArticle(hero) : null;
  },
  ["home-hero"],
  { tags: [CACHE_TAGS.articles, CACHE_TAGS.homepage], revalidate: 300 },
);

/** The hero ID participates in the cache key through the function arguments. */
export const getHomeBriefing = unstable_cache(
  async (heroId: string) => {
    const articles = await db.query.article.findMany({
      where: and(
        eq(articleTable.status, "PUBLISHED"),
        or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date())),
        ne(articleTable.id, heroId),
      ),
      orderBy: (a, { desc }) => [desc(a.publishedAt)],
      limit: 4,
      columns: ARTICLE_CARD_COLUMNS,
      with: ARTICLE_CARD_WITH,
    });
    return articles.map(maskPublicArticle);
  },
  ["home-briefing"],
  { tags: [CACHE_TAGS.articles, CACHE_TAGS.homepage], revalidate: 300 },
);

/** Editor's Picks - Fetched independently to prevent them falling out of the recent 60 limit */
export const getHomePicks = unstable_cache(
  async () => {
    try {
      const articles = await db.query.article.findMany({
        where: and(
          eq(articleTable.status, "PUBLISHED"),
          or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date())),
          eq(articleTable.homepagePlacement, "picks")
        ),
        // Rolling queue: most recently picked leads. Legacy picks that predate
        // editorPickedAt are backfilled in the migration; NULLS LAST keeps any
        // stragglers behind real stamps. publishedAt breaks ties.
        orderBy: (a, { desc }) => [sql`${a.editorPickedAt} DESC NULLS LAST`, desc(a.publishedAt)],
        limit: 6,
        columns: ARTICLE_CARD_COLUMNS,
        with: ARTICLE_CARD_WITH,
      });
      return articles.map(maskPublicArticle);
    } catch (error) {
      console.warn("[cached-queries] Failed to fetch home picks:", error);
      return [];
    }
  },
  ["home-picks"],
  { tags: [CACHE_TAGS.articles, CACHE_TAGS.homepage], revalidate: 300 }
);

/** The /latest wire, newest first. */
export const getLatestArticles = unstable_cache(
  async () => {
    try {
      return await queryPublicFeed(0, LATEST_ARTICLE_LIMIT);
    } catch (error) {
      console.warn("[cached-queries] Failed to fetch latest articles:", error);
      return [];
    }
  },
  ["latest-articles-v2"],
  { tags: [CACHE_TAGS.articles], revalidate: 180 }
);

/**
 * Published articles in one category.
 *
 * The slug is both a key part and part of the tag: `categoryTag(slug)` lets a
 * single section be invalidated when an article lands in it, without dropping
 * the other twelve categories.
 */
export function getCategoryArticles(slug: string, subSlug?: string) {
  return unstable_cache(
    async () => {
      try {
        return await queryPublicFeed(0, LISTING_ARTICLE_LIMIT, { categorySlug: slug, subcategorySlug: subSlug });
      } catch (error) {
        console.warn(`[cached-queries] Failed to fetch category articles for ${slug}:`, error);
        return [];
      }
    },
    ["category-articles-v2", slug, subSlug || "all"],
    { tags: [CACHE_TAGS.articles, categoryTag(slug), ...(subSlug ? [categoryTag(subSlug)] : [])], revalidate: 300 }
  )();
}

/** Published articles carrying one tag. */
export function getTagArticles(slug: string, offset: number = 0, limit: number = LISTING_ARTICLE_LIMIT) {
  return unstable_cache(
    async () => {
      try {
        return await queryPublicFeed(offset, limit, { tagSlug: slug });
      } catch (error) {
        console.warn(`[cached-queries] Failed to fetch tag articles for ${slug}:`, error);
        return [];
      }
    },
    ["tag-articles-v2", slug, String(offset), String(limit)],
    { tags: [CACHE_TAGS.articles, tagTag(slug)], revalidate: 300 }
  )();
}

/** Most-read published articles for the shared Sidebar. */
export const getMostReadArticles = unstable_cache(
  async (limit: number = 5) => {
    try {
      return await db.query.article.findMany({
        where: and(
          eq(articleTable.status, "PUBLISHED"),
          or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date())),
        ),
        orderBy: (a, { desc }) => [desc(a.views), desc(a.publishedAt)],
        limit,
        columns: {
          id: true,
          slug: true,
          title: true,
          readingTime: true,
        },
        with: {
          category: {
            columns: { name: true },
          },
        },
      });
    } catch (error) {
      console.warn("[cached-queries] Failed to fetch most read articles:", error);
      return [];
    }
  },
  ["most-read-articles"],
  { tags: [CACHE_TAGS.articles], revalidate: 300 },
);

/** Published articles by one author. */
export function getAuthorArticles(authorId: string, authorSlug: string) {
  return unstable_cache(
    async () => {
      try {
        return await queryPublicFeed(0, LISTING_ARTICLE_LIMIT, { authorId });
      } catch (error) {
        console.warn(`[cached-queries] Failed to fetch author articles for ${authorId}:`, error);
        return [];
      }
    },
    ["author-articles-v2", authorId],
    { tags: [CACHE_TAGS.articles, authorTag(authorSlug)], revalidate: 600 }
  )();
}

/**
 * Slugs for generateStaticParams.
 *
 * Deliberately bounded. Pre-rendering every article would make build time grow
 * with the archive, and the long tail is not what readers arrive on. Recent
 * stories are pre-built; anything older renders on first request and is cached
 * from then on.
 */
export const getRecentArticleSlugs = unstable_cache(
  async (limit: number = 50) => {
    try {
      return await db.query.article.findMany({
        // A scheduled article is PUBLISHED with a future publishedAt. It must
        // not be pre-built (the page would render, then 404 on the same slug
        // for anyone who followed the build output) — the same "not yet live"
        // test the feed queries use.
        where: and(
          eq(articleTable.status, "PUBLISHED"),
          or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date())),
        ),
        orderBy: (a, { desc }) => [desc(a.publishedAt)],
        limit: limit,
        columns: { slug: true },
      });
    } catch (error) {
      console.warn("[cached-queries] Failed to fetch recent article slugs:", error);
      return [];
    }
  },
  ["recent-article-slugs"],
  { tags: [CACHE_TAGS.articles], revalidate: 3600 }
);

/** Cache the whole recommendation set so fallback and exclusions stay consistent. */
export function getArticleRecommendations(articleId: string, tagIds: string[], mainCategoryId: string | null, categorySlug: string) {
  return unstable_cache(
    async (id: string, tags: string[], categoryId: string | null) => {
      let related = tags.length > 0 ? await db.query.article.findMany({
        where: and(
          publicFeedWhere(),
          ne(articleTable.id, id),
          inArray(articleTable.id, sql`(SELECT "A" FROM "_ArticleToTag" WHERE "B" IN (${sql.join(tags.map(tagId => sql`${tagId}`), sql`, `)}))`),
        ),
        orderBy: (a, { desc }) => [desc(a.publishedAt), desc(a.id)],
        limit: 3,
        columns: ARTICLE_CARD_COLUMNS,
        with: ARTICLE_CARD_WITH,
      }) : [];

      if (related.length < 3) {
        const fallback = await db.query.article.findMany({
          where: and(
            publicFeedWhere(),
            categoryId ? sql`${articleTable.categoryId} IN (SELECT id FROM "Category" WHERE id = ${categoryId} OR "parentId" = ${categoryId})` : undefined,
            notInArray(articleTable.id, [id, ...related.map(article => article.id)]),
          ),
          orderBy: (a, { desc }) => [desc(a.publishedAt), desc(a.id)],
          limit: 3 - related.length,
          columns: ARTICLE_CARD_COLUMNS,
          with: ARTICLE_CARD_WITH,
        });
        related = [...related, ...fallback];
      }

      const discoverMore = await db.query.article.findMany({
        where: and(
          publicFeedWhere(),
          categoryId ? sql`${articleTable.categoryId} NOT IN (SELECT id FROM "Category" WHERE id = ${categoryId} OR "parentId" = ${categoryId})` : undefined,
          notInArray(articleTable.id, [id, ...related.map(article => article.id)]),
        ),
        orderBy: (a, { desc }) => [desc(a.publishedAt), desc(a.id)],
        limit: 4,
        columns: ARTICLE_CARD_COLUMNS,
        with: ARTICLE_CARD_WITH,
      });

      return { related: related.map(maskPublicArticle), discoverMore: discoverMore.map(maskPublicArticle) };
    },
    ["article-recommendations", categorySlug],
    { tags: [CACHE_TAGS.articles, categoryTag(categorySlug)], revalidate: 3600 },
  )(articleId, [...new Set(tagIds)].sort(), mainCategoryId);
}

// ─────────────────────────────────────────────────────────────────────────────
// The cached published-articles search index
// ─────────────────────────────────────────────────────────────────────────────
//
// One read of the searchable columns of every published article, held in Next's
// data cache under the `search-index` tag. Live search and /search rank against
// this snapshot in memory (lib/search-index.ts) instead of querying Postgres.
//
// Why the whole archive rather than per-query caching of answers: a query cache
// only helps the second reader who types the same words, and the traffic here is
// long-tailed — nearly every search is unique, so the database would still be
// woken by the first person to type each phrase, which is all of them. A single
// snapshot converts that traffic into one query per day per cache lifetime.
//
// A 24-hour TTL is safe *because* the tag is authoritative: every write that can
// change a published article's searchable fields — save, publish, unpublish,
// schedule, delete, rename a section, rename a tag, change a byline — goes
// through `revalidateTag(CACHE_TAGS.searchIndex)` (see lib/cache-tags.ts), so the
// ceiling is a backstop, not the mechanism that keeps the site fresh. Two extra
// benefits fall out of the long window: a crawler hitting /search, the sitemaps
// or the feed cannot keep re-running the same aggregate, and an idle deployment
// lets the compute suspend.
//
// NOTE on size: the snapshot is bounded twice — at most
// `SEARCH_INDEX_MAX_ARTICLES` rows, each carrying at most
// `SEARCH_INDEX_BODY_CHARS` characters of body text. Both are env-tunable, and
// `SEARCH_INDEX_BODY_CHARS=0` reduces search to metadata only (title, deck,
// slug, section, byline, tags) for an archive large enough to make the body
// slice the dominant cost.
// ─────────────────────────────────────────────────────────────────────────────

/** Rows in the snapshot. Beyond this the newest articles are indexed. */
function searchIndexMaxArticles(): number {
  const parsed = Number(process.env.SEARCH_INDEX_MAX_ARTICLES);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 5000;
}

/** Body characters per article carried in the snapshot (0 = metadata only). */
function searchIndexBodyChars(): number {
  const raw = process.env.SEARCH_INDEX_BODY_CHARS;
  if (raw === undefined || raw === "") return 1200;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 1200;
  return Math.floor(parsed);
}

/** ISO string for a timestamp column, whether it arrives as a Date or a string. */
function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

type SearchIndexRow = Awaited<ReturnType<typeof querySearchIndexRows>>[number];

async function querySearchIndexRows(limit: number, bodyChars: number) {
  return db.query.article.findMany({
    where: and(
      eq(articleTable.status, "PUBLISHED"),
      // A scheduled story already holds PUBLISHED with a future stamp. It is not
      // live, so it must not be searchable — the same "not yet" test the feed
      // queries use.
      or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date())),
    ),
    orderBy: (a, { desc: orderDesc }) => [orderDesc(a.publishedAt), orderDesc(a.id)],
    limit,
    columns: {
      id: true,
      slug: true,
      title: true,
      deck: true,
      img: true,
      author: true,
      role: true,
      isAnonymous: true,
      views: true,
      readingTime: true,
      createdAt: true,
      publishedAt: true,
      categoryId: true,
      legacyTags: true,
    },
    // The body slice is truncated in SQL rather than in Node: the full
    // `textContent` of a published archive is tens of megabytes, and none of it
    // beyond the cap is ever read. Inlined rather than bound because the value is
    // a code-level constant, not input — a parameter here would need a cast to
    // give Postgres the `integer` it wants for `left()`.
    extras: {
      bodyText: sql<string | null>`left(${articleTable.textContent}, ${sql.raw(String(bodyChars))})`.as("bodyText"),
    },
    with: {
      category: {
        columns: { id: true, name: true, slug: true },
        with: { parent: { columns: { name: true, slug: true } } },
      },
      authorModel: { columns: { name: true, slug: true, avatar: true, role: true } },
      tags: { with: { tag: { columns: { name: true, slug: true } } } },
    },
  });
}

function toSearchIndexEntry(row: SearchIndexRow): SearchIndexEntry {
  // The masked byline is what /search renders, and it is derived through the
  // same helper every public listing uses — an anonymous story shows its desk
  // persona, not the reporter's name.
  const publicAuthor = getArticleAuthor(row as Parameters<typeof getArticleAuthor>[0]);
  // `textContent` is the sanitized body HTML with tags stripped, so it arrives
  // with the surrounding whitespace of the markup it came from. Trimming here
  // keeps the snapshot's byte count down and makes the two branches below
  // consistent (an all-whitespace body is no body).
  const bodyText = row.bodyText?.trim();
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    deck: row.deck,
    img: row.img,
    image: resolveIndexImage(row.img),
    createdAt: isoOrNull(row.createdAt) ?? new Date(0).toISOString(),
    publishedAt: isoOrNull(row.publishedAt),
    readingTime: row.readingTime || 1,
    views: row.views || 0,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    categoryParentName: row.category?.parent?.name ?? null,
    categoryParentSlug: row.category?.parent?.slug ?? null,
    authorModelName: row.authorModel?.name ?? null,
    authorModelSlug: row.authorModel?.slug ?? null,
    authorModelAvatar: row.authorModel?.avatar ?? null,
    legacyAuthor: row.author,
    isAnonymous: Boolean(row.isAnonymous),
    publicAuthorName: row.isAnonymous ? publicAuthor.name : (row.authorModel?.name || row.author || publicAuthor.name),
    publicAuthorRole: row.isAnonymous ? "Editorial Desk" : (row.authorModel?.role || row.role || publicAuthor.role),
    tags: (row.tags ?? [])
      .map(entry => entry.tag)
      .filter((tag): tag is { name: string; slug: string } => Boolean(tag))
      .map(tag => ({ name: tag.name, slug: tag.slug })),
    legacyTags: (row.legacyTags ?? []).filter(Boolean),
    bodyText: bodyText ? bodyText : null,
  };
}

export const getPublishedSearchIndex = unstable_cache(
  async (): Promise<SearchIndexPayload> => {
    const limit = searchIndexMaxArticles();
    const bodyChars = searchIndexBodyChars();

    // One retry: Neon's first query after a cold start can exceed the pool's
    // connect timeout while the compute wakes. The second attempt lands on a
    // warm compute. Anything else is rethrown rather than cached — a 24-hour
    // entry built from a failed read would take search down for the day.
    let rows: SearchIndexRow[];
    try {
      rows = await querySearchIndexRows(limit, bodyChars);
    } catch (error) {
      console.warn("[cached-queries] Search index read failed, retrying once:", error);
      await new Promise(resolve => setTimeout(resolve, 1_500));
      rows = await querySearchIndexRows(limit, bodyChars);
    }

    const entries = rows.map(toSearchIndexEntry);

    // Only when the snapshot was truncated does the real total differ, and only
    // then is a second query worth issuing.
    let total = entries.length;
    if (rows.length >= limit) {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(articleTable)
        .where(and(
          eq(articleTable.status, "PUBLISHED"),
          or(isNull(articleTable.publishedAt), lte(articleTable.publishedAt, new Date())),
        ));
      total = countRow?.count ?? entries.length;
    }

    return { entries, total, builtAt: new Date().toISOString() };
  },
  ["published-search-index-v1"],
  { tags: [CACHE_TAGS.searchIndex, CACHE_TAGS.articles], revalidate: 86400 },
);

export const getBenchmarkLeaderboard = unstable_cache(
  async () => {
    try {
      const records = await db.select().from(benchmarkLeaderboard);
      const dict: Record<string, { topScore: number, deviceName: string }> = {};
      records.forEach(r => {
        const key = `${r.category}-${r.subCategory}-${r.metric}`;
        dict[key] = { topScore: r.topScore, deviceName: r.deviceName };
      });
      return dict;
    } catch (error) {
      console.error("[cached-queries] Failed to fetch benchmark leaderboard:", error);
      return {};
    }
  },
  ["benchmark-leaderboard"],
  { tags: ["benchmark-leaderboard"], revalidate: 3600 }
);

// ─────────────────────────────────────────────────────────────────────────────
// Editorial intelligence index (admin dashboard widgets)
// ─────────────────────────────────────────────────────────────────────────────
// One tagged snapshot of article *metadata* (never body text) powers the
// SEO & editorial quality audit and the category coverage breakdown on
// /admin. Both widgets therefore cost zero extra database wake-ups on
// repeat visits, exactly like every other cached listing in this file.
//
// The scope is part of the cache key: an author must never see another
// writer's drafts in the audit, so the same buildArticleScope filter the
// rest of the console applies is rebuilt inside the cached read from the
// serialised actor identity.
export interface EditorialAuditEntry {
  id: string;
  slug: string;
  status: string;
  title: string;
  deck: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  img: string | null;
  featuredImageAlt: string | null;
  readingTime: number;
  views: number;
  updatedAt: Date | string;
  categorySlug: string | null;
  categoryName: string | null;
}

export function getEditorialAuditIndex(actor: Actor) {
  return unstable_cache(
    async (): Promise<EditorialAuditEntry[]> => {
      try {
        const rows = await db.query.article.findMany({
          where: buildArticleScope(actor),
          columns: {
            id: true,
            slug: true,
            status: true,
            title: true,
            deck: true,
            seoTitle: true,
            seoDesc: true,
            img: true,
            featuredImageAlt: true,
            readingTime: true,
            views: true,
            updatedAt: true,
          },
          with: { category: { columns: { slug: true, name: true } } },
        });
        return rows.map(row => ({
          id: row.id,
          slug: row.slug,
          status: row.status,
          title: row.title,
          deck: row.deck,
          seoTitle: row.seoTitle,
          seoDesc: row.seoDesc,
          img: row.img,
          featuredImageAlt: row.featuredImageAlt,
          readingTime: row.readingTime,
          views: row.views,
          updatedAt: row.updatedAt,
          categorySlug: row.category?.slug ?? null,
          categoryName: row.category?.name ?? null,
        }));
      } catch (error) {
        console.warn("[cached-queries] Failed to fetch editorial audit index:", error);
        return [];
      }
    },
    ["editorial-audit-index-v1", actor.role, actor.authorId ?? "all"],
    { tags: [CACHE_TAGS.articles], revalidate: 300 },
  )();
}
