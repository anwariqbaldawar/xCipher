import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Live article search
// ─────────────────────────────────────────────────────────────────────────────
//
// One query, one round trip, ranked in Postgres. The alternative — a keyword
// query per field, stitched together in JavaScript — was what the previous
// implementation did, and it could not rank across fields at all: a title match
// and a chance mention in a story's body arrived in the same list ordered only
// by publish date.
//
// The archive stores structure in Postgres and bodies in Cloudflare R2. Search
// therefore reads *metadata* only (title, slug, deck, tags, section, author,
// plus the denormalised `textContent` column the editor already maintains) and
// never fetches an R2 object. Image keys are resolved to CDN-ready thumbnail
// URLs here, on the server, so a dropdown result is a single ready-to-render
// record.
// ─────────────────────────────────────────────────────────────────────────────

import { dbRead as db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { IMAGE_WIDTHS, resolveImageSrc } from "@/lib/image-url";
import {
  buildLikePattern,
  buildPrefixTsQuery,
  describeMatchField,
  normalizeQuery,
  truncateExcerpt,
} from "@/lib/search-query";
import type { LiveSearchResult, MatchField } from "@/lib/search-types";

export type { LiveSearchResult } from "@/lib/search-types";

export interface LiveSearchOptions {
  limit?: number;
  offset?: number;
}

/** Replica reads: search is a listing surface and must not load the primary. */
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 40;

interface RawSearchRow {
  id: string;
  slug: string;
  title: string;
  deck: string | null;
  img: string | null;
  publishedAt: string | Date | null;
  readingTime: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  authorSlug: string | null;
  authorAvatar: string | null;
  legacyAuthor: string | null;
  isAnonymous: boolean;
  matchedTags: string[] | null;
  matchField: string;
  score: number | string;
}

/**
 * Legacy tag array (`Article.tags`), which predates the `_ArticleToTag` join
 * table and still holds the tags of older stories. Searched as well so a
 * pre-migration article is not invisible to search.
 */
function legacyTagClause(pattern: string) {
  return sql`EXISTS (
    SELECT 1 FROM unnest(a."tags") AS legacy_tag(value) WHERE legacy_tag.value ILIKE ${pattern}
  )`;
}

/**
 * Ranked metadata search.
 *
 * `pattern` is the reader's query wrapped in LIKE wildcards, escaped so `%` and
 * `_` are literal. Every branch below is index-friendly on a publication-sized
 * archive (thousands of rows, not millions): the ILIKE branches use the trigram
 * behaviour of a sequential scan on the article table, and the full-text branch
 * uses the existing `Article_search_idx` GIN index.
 */
export async function searchArticlesLive(
  rawQuery: string,
  options: LiveSearchOptions = {},
): Promise<LiveSearchResult[]> {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);
  const pattern = buildLikePattern(query);
  const prefixQuery = buildPrefixTsQuery(query);

  // The full-text branches only exist when the query has searchable characters;
  // the ILIKE branches always do, so a query like "C++" still works.
  // Every reference below is qualified with the FROM alias `a`. Naming the
  // table instead ("Article"."title") reads fine but is not a legal reference
  // once the table is aliased — Postgres answers 42P01, `invalid reference to
  // FROM-clause entry for table "Article"`, and the whole live search 500s.
  const ftsVector = sql`to_tsvector('english', coalesce(a."title", '') || ' ' || coalesce(a."deck", '') || ' ' || coalesce(a."textContent", ''))`;
  const ftsMatches = prefixQuery
    ? sql`${ftsVector} @@ to_tsquery('english', ${prefixQuery})`
    : sql`false`;
  const ftsRank = prefixQuery
    ? sql`coalesce(ts_rank(${ftsVector}, to_tsquery('english', ${prefixQuery})), 0)`
    : sql`0`;

  const tagMatch = sql`EXISTS (
    SELECT 1 FROM "_ArticleToTag" j JOIN "Tag" t ON t.id = j."B"
    WHERE j."A" = a."id" AND (t.name ILIKE ${pattern} OR t.slug ILIKE ${pattern})
  )`;

  // ─── Retry wrapper ──────────────────────────────────────────────────────────
  // Neon serverless compute scales to zero after ~5 minutes of inactivity.
  // The first query after a cold start can take 1-3 seconds for the compute to
  // wake. If the WebSocket handshake doesn't complete within the pool's
  // connectionTimeoutMillis, the driver surfaces an ETIMEDOUT. A single retry
  // after a short backoff is almost always enough because the compute is fully
  // warm by the second attempt.
  // ────────────────────────────────────────────────────────────────────────────
  const MAX_RETRIES = 1;
  const RETRY_DELAY_MS = 1_500;

  async function executeSearchQuery() {
    return db.execute(sql`
      SELECT
        a."id",
        a."slug",
        a."title",
        a."deck",
        a."img",
        a."publishedAt",
        a."readingTime",
        a."author"      AS "legacyAuthor",
        a."isAnonymous",
        c."name"        AS "categoryName",
        c."slug"        AS "categorySlug",
        au."name"       AS "authorName",
        au."slug"       AS "authorSlug",
        au."avatar"     AS "authorAvatar",
        tags.matched    AS "matchedTags",
        CASE
          WHEN lower(a."title") = lower(${query})                 THEN 'title'
          WHEN a."title" ILIKE ${pattern}                          THEN 'title'
          WHEN a."slug" ILIKE ${pattern}                           THEN 'slug'
          WHEN tags.matched IS NOT NULL                            THEN 'tag'
          WHEN coalesce(a."deck", '') ILIKE ${pattern}             THEN 'summary'
          WHEN c."name" ILIKE ${pattern}                           THEN 'category'
          WHEN au."name" ILIKE ${pattern}                          THEN 'author'
          WHEN coalesce(a."textContent", '') ILIKE ${pattern}      THEN 'content'
          WHEN ${ftsMatches}                                       THEN 'content'
          ELSE 'none'
        END AS "matchField",
        (
          CASE
            WHEN lower(a."title") = lower(${query})             THEN 100
            WHEN a."title" ILIKE ${`${query}%`}                 THEN 80
            WHEN a."title" ILIKE ${pattern}                     THEN 65
            WHEN a."slug" ILIKE ${pattern}                      THEN 50
            WHEN tags.matched IS NOT NULL                       THEN 40
            WHEN coalesce(a."deck", '') ILIKE ${pattern}        THEN 30
            WHEN c."name" ILIKE ${pattern}                      THEN 22
            WHEN au."name" ILIKE ${pattern}                     THEN 22
            WHEN coalesce(a."textContent", '') ILIKE ${pattern} THEN 14
            ELSE 0
          END
          + (${ftsRank} * 12)
          + LEAST(coalesce(a."views", 0) / 1000.0, 5)
        ) AS "score"
      FROM "Article" a
      LEFT JOIN "Category" c  ON c."id" = a."categoryId"
      LEFT JOIN "Author"   au ON au."id" = a."authorId"
      LEFT JOIN LATERAL (
        SELECT array_agg(t."name" ORDER BY t."name") AS matched
        FROM "_ArticleToTag" j JOIN "Tag" t ON t."id" = j."B"
        WHERE j."A" = a."id" AND (t."name" ILIKE ${pattern} OR t."slug" ILIKE ${pattern})
      ) tags ON true
      WHERE a."status" = 'PUBLISHED'::"ArticleStatus"
        AND (a."publishedAt" IS NULL OR a."publishedAt" <= now())
        AND (
          a."title" ILIKE ${pattern}
          OR a."slug" ILIKE ${pattern}
          OR coalesce(a."deck", '') ILIKE ${pattern}
          OR coalesce(a."textContent", '') ILIKE ${pattern}
          OR c."name" ILIKE ${pattern}
          OR au."name" ILIKE ${pattern}
          OR ${tagMatch}
          OR ${legacyTagClause(pattern)}
          OR ${ftsMatches}
        )
      ORDER BY "score" DESC, a."publishedAt" DESC NULLS LAST, a."id" ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  function isTransientError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const msg = String((err as { message?: string }).message || "");
    const code = (err as { code?: string }).code || "";
    return (
      msg.includes("ETIMEDOUT") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("terminating connection") ||
      msg.includes("Connection terminated") ||
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      code === "ECONNREFUSED" ||
      // AggregateError wraps multiple connection failures
      err instanceof AggregateError
    );
  }

  let result;
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await executeSearchQuery();
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isTransientError(err)) {
        console.warn(
          `[search] transient error on attempt ${attempt + 1}, retrying in ${RETRY_DELAY_MS}ms:`,
          (err as Error).message || err,
        );
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }

  if (!result) throw lastError;

  const rows = (result.rows || []) as unknown as RawSearchRow[];

  return rows.map(row => {
    const matchField = (row.matchField || "none") as MatchField;
    const matchedTags = row.matchedTags || [];
    // The featured image key is resolved here so the reader's browser gets a
    // Cloudflare-transformed thumbnail (or the neutral cover) with no second
    // request and no unsigned R2 fetch.
    const imageKey = row.img || null;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      url: `/article/${row.slug}`,
      excerpt: truncateExcerpt(row.deck, 150),
      image: resolveImageSrc(imageKey, IMAGE_WIDTHS.row, 168),
      imageKey,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      readingTime: row.readingTime || 1,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      authorName: row.authorName || row.legacyAuthor,
      authorSlug: row.isAnonymous ? null : row.authorSlug,
      authorAvatar: row.isAnonymous ? null : row.authorAvatar,
      matchField,
      matchLabel: describeMatchField(matchField, matchedTags),
      matchedTags,
      score: Number(row.score) || 0,
    };
  });
}
