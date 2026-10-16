// ─────────────────────────────────────────────────────────────────────────────
// Cache tags
// ─────────────────────────────────────────────────────────────────────────────
//
// One vocabulary for cache invalidation, shared by the pages that read and the
// server actions that write.
//
// The previous approach called revalidatePath("/", "layout") after any
// publication-affecting write. That is the broadest invalidation Next.js
// offers: it drops the cached output of every route under the root layout, so
// publishing one article discarded the homepage, every category, every tag,
// every author page and every other article. The next visitor to each of those
// paid a full re-render and a fresh set of queries.
//
// Tags let a write say what actually changed. Publishing an article touches
// article listings, so it invalidates `articles` and leaves the rest alone.
//
// Kept as functions rather than string literals at the call sites so a typo is
// a compile error instead of an invalidation that silently never fires -- the
// worst failure mode here, because nothing appears broken until a reader
// complains about stale content.
// ─────────────────────────────────────────────────────────────────────────────

export const CACHE_TAGS = {
  /** Any article list: homepage, /latest, category, tag, author, search. */
  articles: "articles",
  homepage: "homepage",
  /**
   * The cached published-articles search index.
   *
   * Live search and /search never touch Postgres: they rank against one
   * `unstable_cache`d snapshot of every published article's metadata (see
   * lib/cached-queries.ts `getPublishedSearchIndex`). That snapshot is the only
   * thing standing between a reader's keystroke and a Neon compute wake-up, so
   * every write that changes a published article has to invalidate it —
   * `articleMutationTags` below includes it for exactly that reason.
   */
  searchIndex: "search-index",
  /** The taxonomy itself -- category and tag names, slugs, counts. */
  taxonomy: "taxonomy",
  /** Author profile records (name, bio, avatar), not their article lists. */
  authors: "authors",
  /** Publication-wide settings: site name, tagline, description. */
  settings: "settings",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/** Tag for one article's own page, so a single story can be invalidated
 *  without dropping every listing that mentions it. */
export function articleTag(slug: string): string {
  return `article:${slug}`;
}

/** Tag for one category's listing. */
export function categoryTag(slug: string): string {
  return `category:${slug}`;
}

/** Tag for one tag's listing. */
export function tagTag(slug: string): string {
  return `tag:${slug}`;
}

/** Tag for one author's profile page. */
export function authorTag(slug: string): string {
  return `author:${slug}`;
}

/** Tag for one article's approved-comment list (reader-facing, cached). */
export function commentsTag(slug: string): string {
  return `comments:${slug}`;
}

/**
 * The tags a publication-state change should invalidate.
 *
 * Collected in one place because the correct set is easy to get subtly wrong at
 * a call site -- forgetting the category tag leaves a published article missing
 * from its own section, which is exactly the kind of bug that surfaces days
 * later as "why isn't my story on the AI page".
 */
export function articleMutationTags(article: {
  slug?: string | null;
  category?: { slug?: string | null } | null;
  authorModel?: { slug?: string | null } | null;
  tagSlugs?: string[];
}): string[] {
  const tags: string[] = [CACHE_TAGS.articles];
  // Search is a separate cached snapshot of the published archive. A save that
  // changes a title, deck, tag, section, byline or status must drop it, or the
  // dropdown keeps offering a headline the editor already replaced.
  tags.push(CACHE_TAGS.searchIndex);
  if (article.slug) tags.push(articleTag(article.slug));
  if (article.category?.slug) tags.push(categoryTag(article.category.slug));
  if (article.authorModel?.slug) tags.push(authorTag(article.authorModel.slug));
  for (const tagSlug of article.tagSlugs || []) {
    tags.push(tagTag(tagSlug));
  }
  return tags;
}

/**
 * The tags a taxonomy change (create / rename / re-slug / delete / merge)
 * should invalidate.
 *
 * Renaming a category or a tag does not touch a single article row, yet it
 * changes the byline chip on every card in that section and the `categoryName`
 * / `matchedTags` a search result carries. Tag-only invalidation is what keeps
 * that correct without dropping unrelated sections, so the article listings,
 * the search index and the taxonomy itself are all named here.
 */
export function taxonomyMutationTags(extra: { categorySlug?: string | null; tagSlug?: string | null } = {}): string[] {
  // `articles` already covers every listing (homepage, /latest, category, tag,
  // author, the sitemaps and the feed) because each of those reads is tagged
  // with it; `search-index` is the one listing tag that is *not* derived from
  // `articles`, so it has to be named explicitly.
  const tags: string[] = [CACHE_TAGS.taxonomy, CACHE_TAGS.articles, CACHE_TAGS.searchIndex];
  if (extra.categorySlug) tags.push(categoryTag(extra.categorySlug));
  if (extra.tagSlug) tags.push(tagTag(extra.tagSlug));
  return tags;
}
