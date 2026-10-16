// ─────────────────────────────────────────────────────────────────────────────
// Published-articles search index: shape, and the in-memory ranker
// ─────────────────────────────────────────────────────────────────────────────
//
// Live search used to run one ranked SQL query per keystroke (see the removed
// `searchArticlesLive` in lib/search.ts). Neon measures billing in CU-hours and
// scales to zero after ~5 minutes idle, so a single reader typing "graph" kept a
// compute awake for the whole afternoon: every debounced request woke it, and it
// stayed awake for the five-minute window after the last one.
//
// This module is the replacement, and it is deliberately *pure* — no database
// import, no `server-only`, no framework. The snapshot it ranks is fetched once
// per day by `getPublishedSearchIndex()` (lib/cached-queries.ts), so:
//
//   • a keystroke never opens a connection;
//   • the ranker is directly unit-testable against fixture rows;
//   • both search surfaces (/api/search and /search) share one scoring model,
//     which is what keeps "the dropdown showed it second" and "the results page
//     shows it second" from drifting apart.
//
// Scoring parity with the SQL it replaces is intentional, and so is the order of
// every branch: the previous ranker scored an exact title hit at 100, a prefix
// title hit at 80, a contained title hit at 65, slug at 50, tag at 40, deck at
// 30, section/author at 22, body mention at 14, plus a full-text fraction and a
// small popularity term. Those numbers are preserved so the ordering readers
// already see does not change when this lands.
//
// Tie-break is `publishedAt DESC NULLS LAST, id ASC`, matching the SQL `ORDER
// BY`, which is what makes offset paging on /search stable.
// ─────────────────────────────────────────────────────────────────────────────

import { IMAGE_WIDTHS, resolveImageSrc } from "@/lib/image-url";
import { describeMatchField, normalizeQuery, truncateExcerpt } from "@/lib/search-query";
import type { LiveSearchResult, MatchField } from "@/lib/search-types";

/** A tag as the byline chip and the match label need it. */
export interface SearchIndexTag {
  name: string;
  slug: string;
}

/**
 * One published article, reduced to the fields a search result renders.
 *
 * Dates are ISO strings, never `Date` objects, because the snapshot is stored in
 * Next's data cache and that layer round-trips through `JSON.stringify` — a
 * `Date` would come back as a string on every cache hit and as a `Date` on a
 * miss, which is exactly the kind of inconsistency that breaks a component in
 * production only.
 *
 * Both the raw byline fields (`authorModelName` / `legacyAuthor`) and the already
 * masked ones (`publicAuthorName`) are carried. The first pair exists so the
 * live dropdown's output is byte-for-byte what the SQL ranker produced; the
 * second is what the /search listing renders, where the article cards go through
 * the same editorial-persona masking every other public listing uses.
 */
export interface SearchIndexEntry {
  id: string;
  slug: string;
  title: string;
  deck: string | null;
  /** Stored image value (an R2 key or an absolute URL), for `imageKey`. */
  img: string | null;
  /** CDN-ready thumbnail, resolved once when the index is built. */
  image: string;
  createdAt: string;
  publishedAt: string | null;
  readingTime: number;
  views: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryParentName: string | null;
  categoryParentSlug: string | null;
  /** Raw byline, as the SQL ranker read it. */
  authorModelName: string | null;
  authorModelSlug: string | null;
  authorModelAvatar: string | null;
  legacyAuthor: string | null;
  isAnonymous: boolean;
  /** Masking applied: the editorial persona for an anonymous story. */
  publicAuthorName: string | null;
  publicAuthorRole: string | null;
  tags: SearchIndexTag[];
  /** The legacy `Article.tags` array, which older rows still carry. */
  legacyTags: string[];
  /**
   * Leading slice of the denormalised body text, used only so a mention deep in
   * a story still ranks as "Mentioned in the story". Capped at build time
   * (`SEARCH_INDEX_BODY_CHARS`) to keep the snapshot bounded.
   */
  bodyText: string | null;
}

/** What the cached snapshot actually stores. */
export interface SearchIndexPayload {
  entries: SearchIndexEntry[];
  /** Published rows in total, which can exceed `entries.length` when capped. */
  total: number;
  /** ISO stamp, for a human reading the payload in a cache dump. */
  builtAt: string;
}

export interface RankOptions {
  limit?: number;
  offset?: number;
}

export interface RankedEntry {
  entry: SearchIndexEntry;
  score: number;
  matchField: MatchField;
  matchedTags: string[];
}

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 40;

/**
 * Scoring weights. Named rather than inlined so a reviewer can diff them against
 * the SQL branches they replace (the comment at the top of this file records the
 * mapping).
 */
const SCORE = {
  titleExact: 100,
  titlePrefix: 80,
  titleContains: 65,
  slug: 50,
  tag: 40,
  summary: 30,
  category: 22,
  author: 22,
  content: 14,
  /** Multiplier applied to the full-text fraction, as `ts_rank * 12` was. */
  fullText: 12,
  /** Views are capped so a runaway popular story cannot outrank relevance. */
  viewsCap: 5,
} as const;

/**
 * Tokens the full-text branch would have used.
 *
 * Same tokenization `buildPrefixTsQuery` applies: lowercase, split on anything
 * that is not `[a-z0-9]`, drop single characters. Duplicated logic is avoided by
 * keeping it here only because the SQL string it produced is gone.
 */
export function fullTextTokens(query: string): string[] {
  return normalizeQuery(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 2)
    .slice(0, 6);
}

/**
 * How many words in `text` begin with `token`.
 *
 * The SQL branch asked Postgres for `ts_rank` against a prefix tsquery, i.e.
 * "how well do the lexemes of title+deck+body match these prefixes". Counting
 * word-boundary hits is the same signal without a lexeme dictionary, and it
 * keeps a mid-word coincidence ("graph" inside "paragraph") from scoring as if
 * the word itself matched.
 */
export function countWordPrefixHits(text: string, token: string): number {
  if (!text || !token) return 0;
  let hits = 0;
  let index = text.indexOf(token);
  while (index !== -1) {
    const before = index === 0 ? "" : text[index - 1];
    if (!/[a-z0-9]/.test(before)) hits += 1;
    index = text.indexOf(token, index + token.length);
  }
  return hits;
}

/** Fraction of the query's tokens that hit a word boundary, 0..1. */
function fullTextFraction(text: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  let score = 0;
  for (const token of tokens) {
    if (countWordPrefixHits(text, token) > 0) score += 1;
    // A mid-word hit still counts for the *match* test above; it just ranks
    // lower, the way a ts_rank hit on a longer lexeme did.
    else if (text.includes(token)) score += 0.5;
  }
  return score / tokens.length;
}

function compareRanked(a: RankedEntry, b: RankedEntry): number {
  if (b.score !== a.score) return b.score - a.score;

  // `publishedAt DESC NULLS LAST`: a story without a publish stamp sorts behind
  // one that has it, at equal relevance.
  const aDate = a.entry.publishedAt;
  const bDate = b.entry.publishedAt;
  if (aDate && bDate && aDate !== bDate) return aDate < bDate ? 1 : -1;
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;

  // Stable across pages: the id breaks the tie exactly as the SQL `ORDER BY` did.
  return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
}

/** Score one entry against a normalized query, or null when it does not match. */
export function scoreSearchIndexEntry(
  entry: SearchIndexEntry,
  query: string,
): RankedEntry | null {
  const needle = normalizeQuery(query).toLowerCase();
  if (!needle) return null;

  const title = (entry.title || "").toLowerCase();
  const slug = (entry.slug || "").toLowerCase();
  const deck = (entry.deck || "").toLowerCase();
  const body = (entry.bodyText || "").toLowerCase();
  const categoryName = (entry.categoryName || "").toLowerCase();
  const byline = `${entry.authorModelName || entry.legacyAuthor || ""}`.toLowerCase();

  // Which tags the query names. Mirrors `t.name ILIKE %q% OR t.slug ILIKE %q%`
  // plus the legacy `Article.tags` array the old SQL also unnested.
  const matchedTags = entry.tags
    .filter(tag => tag.name.toLowerCase().includes(needle) || tag.slug.toLowerCase().includes(needle))
    .map(tag => tag.name);
  const legacyTagHit = entry.legacyTags.some(tag => tag.toLowerCase().includes(needle));
  const tagHit = matchedTags.length > 0 || legacyTagHit;

  const tokens = fullTextTokens(needle);
  const fullText = `${title} ${deck} ${body}`;
  const fullTextMatched = tokens.length > 0 && tokens.every(token => fullText.includes(token));

  // The WHERE clause of the query this replaces, branch for branch.
  const matched =
    title.includes(needle) ||
    slug.includes(needle) ||
    deck.includes(needle) ||
    body.includes(needle) ||
    categoryName.includes(needle) ||
    byline.includes(needle) ||
    tagHit ||
    fullTextMatched;

  if (!matched) return null;

  // Same CASE order as the SQL, so `matchField` (and therefore the match label
  // chip) is decided by the strongest field, not by scan order.
  let matchField: MatchField = "none";
  if (title === needle || title.includes(needle)) matchField = "title";
  else if (slug.includes(needle)) matchField = "slug";
  else if (tagHit) matchField = "tag";
  else if (deck.includes(needle)) matchField = "summary";
  else if (categoryName.includes(needle)) matchField = "category";
  else if (byline.includes(needle)) matchField = "author";
  else if (body.includes(needle)) matchField = "content";
  else if (fullTextMatched) matchField = "content";

  let score = 0;
  if (title === needle) score = SCORE.titleExact;
  else if (title.startsWith(needle)) score = SCORE.titlePrefix;
  else if (title.includes(needle)) score = SCORE.titleContains;
  else if (slug.includes(needle)) score = SCORE.slug;
  else if (tagHit) score = SCORE.tag;
  else if (deck.includes(needle)) score = SCORE.summary;
  else if (categoryName.includes(needle)) score = SCORE.category;
  else if (byline.includes(needle)) score = SCORE.author;
  else if (body.includes(needle)) score = SCORE.content;

  score += fullTextFraction(fullText, tokens) * SCORE.fullText;
  score += Math.min(Math.max(entry.views || 0, 0) / 1000, SCORE.viewsCap);

  return { entry, score, matchField, matchedTags };
}

/**
 * Rank the whole snapshot in memory.
 *
 * Cost is one linear pass over the snapshot with substring tests — no
 * tokenization of the corpus, no allocation per non-matching row — which is what
 * makes the sub-5 ms budget achievable for an archive of a few thousand stories.
 */
export function rankSearchIndex(
  entries: readonly SearchIndexEntry[],
  rawQuery: string,
  options: RankOptions = {},
): LiveSearchResult[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);

  const ranked: RankedEntry[] = [];
  for (const entry of entries) {
    const scored = scoreSearchIndexEntry(entry, query);
    if (scored) ranked.push(scored);
  }

  ranked.sort(compareRanked);

  return ranked
    .slice(offset, offset + limit)
    .map(({ entry, score, matchField, matchedTags }) => toLiveSearchResult(entry, matchField, matchedTags, score));
}

/** Snapshot entry -> the wire shape the dropdown and the results page render. */
export function toLiveSearchResult(
  entry: SearchIndexEntry,
  matchField: MatchField,
  matchedTags: string[],
  score: number,
): LiveSearchResult {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    url: `/article/${entry.slug}`,
    excerpt: truncateExcerpt(entry.deck, 150),
    image: entry.image,
    imageKey: entry.img,
    publishedAt: entry.publishedAt,
    readingTime: entry.readingTime || 1,
    categoryName: entry.categoryName,
    categorySlug: entry.categorySlug,
    // `authorName || legacyAuthor` and the anonymity guard are copied from the
    // previous mapping so a result row renders identically.
    authorName: entry.authorModelName || entry.legacyAuthor,
    authorSlug: entry.isAnonymous ? null : entry.authorModelSlug,
    authorAvatar: entry.isAnonymous ? null : entry.authorModelAvatar,
    matchField,
    matchLabel: describeMatchField(matchField, matchedTags),
    matchedTags,
    score,
  };
}

/**
 * Snapshot entry -> the card shape `StoryRow` renders on /search.
 *
 * Built here rather than in the page so the two modes of the results page
 * (ranked, and the legacy `?cat=` browse) cannot produce differently-shaped
 * rows. Public byline fields are the masked ones, matching what
 * `maskPublicArticle` produced when the page hydrated these rows from Postgres.
 */
export function toSearchListingRow(entry: SearchIndexEntry) {
  const parent = entry.categoryParentSlug
    ? { name: entry.categoryParentName || "", slug: entry.categoryParentSlug }
    : null;
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    deck: entry.deck,
    img: entry.img,
    author: entry.publicAuthorName,
    role: entry.publicAuthorRole,
    isAnonymous: entry.isAnonymous,
    views: entry.views,
    readingTime: entry.readingTime || 1,
    // The one timestamp a card renders. `publishedAt` is deliberately not copied
    // through: the card contract has no field for it, and a second date on the
    // row would just be a value a future edit could start rendering stale.
    createdAt: entry.publishedAt || entry.createdAt,
    category: entry.categorySlug
      ? {
          // `undefined` rather than `null` for the optional halves: the card's
          // prop type is `Partial<Category>`, which admits a missing field but
          // not an explicit null one.
          id: entry.categoryId ?? undefined,
          name: entry.categoryName ?? undefined,
          slug: entry.categorySlug,
          parent,
        }
      : null,
    authorModel: entry.isAnonymous || !entry.publicAuthorName
      ? null
      : { name: entry.publicAuthorName, slug: entry.authorModelSlug, avatar: entry.authorModelAvatar },
    tags: entry.tags.map(tag => ({ tag: { name: tag.name, slug: tag.slug } })),
  };
}

/** The thumbnail the dropdown requests, resolved once at index build time. */
export function resolveIndexImage(imageKey: string | null): string {
  return resolveImageSrc(imageKey, IMAGE_WIDTHS.row, 168);
}
