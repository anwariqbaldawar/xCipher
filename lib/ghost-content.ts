// ─────────────────────────────────────────────────────────────────────────────
// Ghost content: recognising test data that should never have been published
// ─────────────────────────────────────────────────────────────────────────────
//
// A test article does not stay a test article. It gets saved, transitioned to
// PUBLISHED by someone clicking through the workflow, picked up by the sitemap
// and the RSS feed, crawled, and indexed — and then it is deleted from the
// dashboard, which removes the row and nothing else. The URL stays in the
// index, the content blob and its images stay in the bucket, and Google Images
// goes on attributing a placeholder truck photo to the homepage.
//
// This module is the *decision* half of the cleanup: given a row, is it ghost
// content, and with how much confidence? Given the set of objects in the
// bucket, which of them does nothing reference any more? Everything here is
// pure — no database, no network, no bucket — so the destructive script that
// consumes it can be reviewed as a thin, obvious shell:
//
//     rows.filter(classifyGhostArticle) -> purge -> delete row
//     listR2Objects() - liveReferences() -> findOrphanObjects -> delete objects
//
// Confidence is deliberately two-tier, because the cost of the two mistakes is
// not symmetric. Deleting a real article is unrecoverable; leaving one test row
// is a five-minute fix. So only unambiguous fixture wording is "confirmed", and
// anything that could plausibly be a real headline — including all Roman Urdu
// matching, which is heuristic by nature — is "probable" and requires either
// `--include-probable` or an explicit `--match`/`--slug` from the operator.

/** Wording that only ever appears in a fixture. */
export const GHOST_PHRASES: readonly string[] = [
  "tiptap editor",
  "ultimate testing document",
  "ulitmate testing document", // the typo that shipped in one of the fixtures
  "testing document",
  "test document",
  "test article",
  "test post",
  "test draft",
  "just a test",
  "testing post",
  "testing article",
  "homenest",
  "movers truck",
  "lorem ipsum",
  "dummy content",
  "dummy post",
  "dummy article",
  "sample article",
  "sample post",
  "placeholder article",
  "placeholder post",
  "example article",
  "example post",
  "my first post",
  "my first article",
  "roman urdu",
  "urdu test",
  "untitled document",
];

/**
 * Wording that is *probably* a fixture but can appear in real copy.
 *
 * "Hello, World" is the canonical first program and a legitimate headline for a
 * programming publication, so a title containing it is reported for review
 * rather than deleted on sight.
 */
export const GHOST_WEAK_PHRASES: readonly string[] = ["hello world"];

/** Slugs that are fixtures on their own, with no other evidence needed. */
export const GHOST_SLUG_EXACT: readonly string[] = [
  "test",
  "testing",
  "test-post",
  "test-article",
  "test-document",
  "test-page",
  "post-test",
  "dummy",
  "dummy-post",
  "sample",
  "sample-post",
  "untitled",
  "hello-world",
  "my-first-post",
  "my-first-article",
  "lorem-ipsum",
];

/**
 * Slug prefixes that can only come from the generator or a "duplicate" action.
 *
 * Short, because a prefix is weak evidence on its own: `test-data-breaches-at-
 * github`, `sample-rate-conversion-in-audio` and `dummy-variables-explained`
 * are all real headlines for a technology publication whose slugs happen to
 * begin with a fixture word. They are reported (see
 * `GHOST_SLUG_WEAK_PREFIXES`) rather than deleted, and the fixtures they were
 * meant to catch are caught by the phrase list instead — `test-post` matches
 * "test post" once the dashes become spaces.
 */
export const GHOST_SLUG_PREFIXES: readonly string[] = [
  "tmp-",
  "temp-",
  "copy-of-",
  "untitled-",
  "lorem-ipsum-",
];

/** Prefixes that suggest a fixture and need corroboration. Report only. */
export const GHOST_SLUG_WEAK_PREFIXES: readonly string[] = [
  "test-",
  "testing-",
  "dummy-",
  "sample-",
  "draft-",
  "new-article-",
  "new-post-",
];

/**
 * Slug shapes that are fixtures.
 *
 * Anchored on purpose. `/(^|-)test(-\d+)?$/` matches `test`, `test-2` and
 * `my-test` but not `test-data-breaches-at-github` — a real headline that
 * happens to start with the word "test" is exactly the false positive that
 * makes an operator distrust a cleanup script.
 */
export const GHOST_SLUG_PATTERNS: readonly RegExp[] = [
  /(^|-)test(-|_)?\d*$/,
  /(^|-)dummy(-|_)?\d*$/,
  /(^|-)sample(-|_)?\d*$/,
  /(^|-)untitled(-|_)?\d*$/,
  /(^|-)tmp(-|_)?\d*$/,
  /^article-\d+$/,
  /^post-\d+$/,
  /^untitled-\d+$/,
  /^draft-\d+$/,
];

/**
 * Distinctly Roman Urdu words.
 *
 * Matched as whole words, and two of them are required (or three weaker ones)
 * before a row is even called *probable*. Words that are also ordinary English
 * — `log`, `the`, `me`, `to`, `do` — are deliberately absent: a single stray
 * match must never be enough to put a real headline in a deletion queue.
 */
export const ROMAN_URDU_STRONG: readonly string[] = [
  "nahi",
  "nahin",
  "kya",
  "kaise",
  "kyun",
  "kyon",
  "mujhe",
  "hamara",
  "hamari",
  "tumhara",
  "tumhari",
  "bohat",
  "bahut",
  "achha",
  "acha",
  "chahiye",
  "raha",
  "rahi",
  "sakta",
  "sakti",
  "hota",
  "hoti",
  "hoga",
  "karna",
  "kiya",
  "gaya",
  "gayi",
  "tha",
  "thi",
  "matlab",
  "jaise",
  "jaisa",
  "wala",
  "wali",
  "yeh",
  "woh",
  "hain",
];

/** Roman Urdu words that are common enough to need corroboration. */
export const ROMAN_URDU_WEAK: readonly string[] = [
  "hai",
  "aur",
  "sab",
  "kuch",
  "kuchh",
  "phir",
  "magar",
  "lekin",
  "abhi",
  "aaj",
  "kal",
  "sirf",
  "bas",
  "zaroor",
  "bahot",
  "kesay",
  "kaisa",
];

export type GhostConfidence = "confirmed" | "probable";

export interface GhostVerdict {
  /** `confirmed` = fixture wording or a fixture slug. `probable` = needs a human. */
  confidence: GhostConfidence;
  /** Every rule that fired, so the report can be checked line by line. */
  reasons: string[];
}

export interface GhostScanInput {
  title?: string | null;
  slug?: string | null;
  deck?: string | null;
  /** Extra phrases from the command line (`--match`). */
  extraPhrases?: readonly string[];
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

function countDistinct(text: string, markers: readonly string[]): string[] {
  const present = new Set(words(text));
  return markers.filter((marker) => present.has(marker));
}

/**
 * Classify one article row.
 *
 * Returns null when nothing fires, so a caller can filter with
 * `rows.map(classifyGhostArticle).filter(Boolean)`.
 */
export function classifyGhostArticle(input: GhostScanInput): GhostVerdict | null {
  const title = (input.title ?? "").toLowerCase();
  const slug = (input.slug ?? "").toLowerCase().trim();
  const deck = (input.deck ?? "").toLowerCase();
  // Slug words are searched with dashes turned into spaces so "testing-document"
  // matches the phrase "testing document".
  const haystack = [title, deck, slug.replace(/[-_]+/g, " ")].join(" \n ");
  const reasons: string[] = [];

  const phrases = [...GHOST_PHRASES, ...(input.extraPhrases ?? []).map((p) => p.toLowerCase())];
  for (const phrase of phrases) {
    if (phrase && haystack.includes(phrase)) reasons.push(`matches the phrase "${phrase}"`);
  }

  if (slug && GHOST_SLUG_EXACT.includes(slug)) {
    reasons.push(`slug "${slug}" is a fixture slug`);
  }

  const prefix = GHOST_SLUG_PREFIXES.find((value) => slug.startsWith(value));
  if (prefix) reasons.push(`slug starts with "${prefix}"`);

  for (const pattern of GHOST_SLUG_PATTERNS) {
    if (slug && pattern.test(slug)) {
      reasons.push(`slug matches ${pattern}`);
      break;
    }
  }

  if (reasons.length) return { confidence: "confirmed", reasons };

  // ── Probable ──────────────────────────────────────────────────────────────
  const probableReasons: string[] = [];

  for (const phrase of GHOST_WEAK_PHRASES) {
    if (haystack.includes(phrase)) probableReasons.push(`contains the phrase "${phrase}" — verify by hand`);
  }

  const strong = countDistinct(`${title} ${deck}`, ROMAN_URDU_STRONG);
  const weak = countDistinct(`${title} ${deck}`, ROMAN_URDU_WEAK);
  if (strong.length >= 2 || (strong.length >= 1 && weak.length >= 2) || weak.length >= 3) {
    probableReasons.push(
      `Roman Urdu wording (${[...strong, ...weak].slice(0, 6).join(", ")}) — likely a draft fixture, not English copy`,
    );
  }

  // A title that is nothing but the word "test" (with counters or brackets) is
  // not fixture *wording*, but it is not a headline either.
  if (/^(test|testing|dummy|sample|untitled|draft|copy of|new article)\b[\s\d().:_-]*$/i.test(title.trim())) {
    probableReasons.push(`title is a placeholder ("${input.title?.trim()}")`);
  }

  if (probableReasons.length) return { confidence: "probable", reasons: probableReasons };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// R2 orphan detection
// ─────────────────────────────────────────────────────────────────────────────

export interface SweepableObject {
  key: string;
  size?: number;
  lastModified?: Date | null;
}

export interface OrphanSweepOptions {
  /**
   * Never delete an object younger than this.
   *
   * An upload lands in the bucket a moment before the row that references it is
   * written, so a sweep running in that window would see a live article's new
   * image as an orphan. A day or more makes the window irrelevant.
   */
  graceMs?: number;
  /** Injectable clock, so the grace window is testable. */
  now?: Date;
}

/**
 * Objects in the bucket that no surviving reference accounts for.
 *
 * `liveKeys` must contain every key referenced by anything that still exists in
 * the database — the article columns (contentUrl, img, ogImage), the inline
 * media inside every stored content body, author avatars, publication settings
 * and revision content keys. A missing entry in that set does not just leave an
 * orphan behind; it deletes a live file. That is why the caller builds it from
 * the database first and why this function takes it as an argument.
 */
export function findOrphanObjects(
  objects: readonly SweepableObject[],
  liveKeys: ReadonlySet<string>,
  options: OrphanSweepOptions = {},
): SweepableObject[] {
  const graceMs = options.graceMs ?? 0;
  const now = options.now ?? new Date();

  return objects.filter((object) => {
    if (!object.key) return false;
    if (liveKeys.has(object.key)) return false;

    if (graceMs > 0) {
      if (!object.lastModified) return false;
      if (now.getTime() - object.lastModified.getTime() < graceMs) return false;
    }

    return true;
  });
}

/**
 * Bucket keys for content bodies that no longer have an article row.
 *
 * `articles/content-<id>.json` is derived from the article id, so an orphaned
 * blob can be recognised from its name alone — no fetch, no parse — which makes
 * this the cheapest sweep and the one that runs first in the script.
 */
export function orphanedContentBlobIds(
  keys: readonly string[],
  liveArticleIds: ReadonlySet<string>,
): { key: string; articleId: string }[] {
  const found: { key: string; articleId: string }[] = [];
  for (const key of keys) {
    const match = /(?:^|\/)articles\/content-([^/]+)\.json$/.exec(key);
    if (!match) continue;
    const articleId = match[1];
    if (liveArticleIds.has(articleId)) continue;
    found.push({ key, articleId });
  }
  return found;
}
