// ─────────────────────────────────────────────────────────────────────────────
// Ghost content detection
// ─────────────────────────────────────────────────────────────────────────────
//
// Test articles do not stay in the CMS. They leak: a fixture titled
// "Tiptap Editor: Ultimate Testing Document" gets saved, auto-published by a
// status default, picked up by /sitemap/pages.xml and /feed.xml, and indexed.
// Deleting the row afterwards removes the page but not the evidence — the URL
// stays in Google's index until it 404s, the R2 objects stay forever, and the
// next deploy re-lists anything that was never actually deleted.
//
// So the sweep needs two things this module provides:
//
//   1. A definition of "this row is a test fixture", applied to every status
//      (a test post that reached PUBLISHED is exactly the case that matters),
//      with the evidence printed rather than hidden behind a boolean.
//   2. A definition of "this bucket object belongs to nothing", which can only
//      be answered by comparing the bucket against every reference the database
//      and the surviving content bodies still make.
//
// Everything here is pure so the destructive script is a thin shell around a
// tested decision. Matching is deliberately two-tier, and the tier is decided
// by how conclusive each signal is *on its own*: `confirmed` means the evidence
// cannot plausibly describe real editorial work (fixture wording, a fixture
// slug, a fixture slug with a counter), `probable` means a human should look
// (a slug that merely starts with `test-`, two Roman Urdu markers, "Hello
// World"). The cost of deleting a real article is far higher than the cost of
// reading a short list, so anything arguable lands in the second tier.

/** Lower-cased substrings that are strong evidence of fixture content. */
export const GHOST_PHRASES: readonly string[] = [
  "tiptap editor",
  "ultimate testing document",
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
  "example article",
  "example post",
  "my first post",
  "my first article",
  "roman urdu",
  "untitled document",
];

/**
 * Phrasing that usually means a fixture but can also appear in a real story.
 *
 * "Hello, World" is the canonical first line of code every programming
 * tutorial prints; on a technology site it is a headline, not a fixture. A
 * match here is reported for review and never deleted automatically.
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

/** Slug prefixes that only ever come from a fixture or a duplicate action. */
export const GHOST_SLUG_PREFIXES: readonly string[] = [
  "test-",
  "testing-",
  "dummy-",
  "sample-",
  "untitled-",
  "copy-of-",
  "lorem-ipsum-",
  "tmp-",
  "temp-",
];

/**
 * Slug shapes that identify a fixture by themselves: a fixture name carrying a
 * counter. Nothing in a real headline produces a slug like `test-3` or
 * `draft-12`, so these can be deleted without a human reading them first.
 */
export const GHOST_SLUG_STRONG_PATTERNS: readonly RegExp[] = [
  /(^|-)(test|testing|dummy|sample|untitled|tmp|temp)-?\d+$/,
  /^article-\d+$/,
  /^post-\d+$/,
  /^draft-\d+$/,
];

/**
 * Slug shapes that only *look* like a fixture.
 *
 * These are reported and nothing more. `nvme-ssd-test`, `test-data-leaks-
 * production` and `untitled-draft-controversy` are slugs a real story can
 * legitimately have, and the cost of deleting one of those by accident is far
 * higher than the cost of reading a short list. A prefix match alone is weak
 * evidence; combined with fixture wording in the title — which the phrase list
 * above already catches — it is not.
 */
export const GHOST_SLUG_WEAK_PATTERNS: readonly RegExp[] = [
  /(^|-)(test|testing|dummy|sample|untitled|tmp|temp)$/,
];

/**
 * Roman Urdu markers.
 *
 * A Roman Urdu test post is not flagged by any English word, so it needs its
 * own signal: distinctive whole-word tokens. Keyword-only words that are also
 * ordinary English (`me`, `to`, `do`, `ka`, `ki`, `ke`, `ye`, `ab`) are left out
 * on purpose — a single stray match must never be enough, which is why the
 * classifier requires at least two distinct tokens before it will even call a
 * row `probable`.
 */
export const ROMAN_URDU_TOKENS: readonly string[] = [
  "hai",
  "hain",
  "nahi",
  "nahin",
  "kya",
  "kaise",
  "kaun",
  "kyun",
  "kyunke",
  "acha",
  "achha",
  "theek",
  "bilkul",
  "lekin",
  "magar",
  "agar",
  "phir",
  "yeh",
  "woh",
  "aur",
  "bhi",
  "mera",
  "meri",
  "hum",
  "tum",
  "aap",
  "bhai",
  "yaar",
  "bahut",
  "thoda",
  "zyada",
  "likha",
  "likhi",
  "likhna",
  "padha",
  "padhi",
  "karta",
  "karti",
  "raha",
  "rahi",
  "gaya",
  "gayi",
  "chahiye",
  "sakta",
  "sakti",
  "waqt",
  "baat",
  "kaam",
];

export type GhostConfidence = "confirmed" | "probable";

export interface GhostVerdict {
  confidence: GhostConfidence;
  /** Human-readable evidence, printed by the sweep so a human can overrule it. */
  reasons: string[];
}

export interface GhostScanInput {
  title?: string | null;
  slug?: string | null;
  deck?: string | null;
  /** Extra fixtures named on the command line (`--match "…"`). */
  extraPhrases?: readonly string[];
}

/**
 * Classify one article row.
 *
 * Returns null for anything that looks like real editorial work, so a caller
 * can filter with `rows.map(classify).filter(Boolean)` and never mistake a
 * missing verdict for a negative one.
 */
export function classifyGhostArticle(input: GhostScanInput): GhostVerdict | null {
  const title = (input.title ?? "").toLowerCase();
  const slug = (input.slug ?? "").toLowerCase().trim();
  const deck = (input.deck ?? "").toLowerCase();
  const haystack = `${title}\n${slug.replace(/-/g, " ")}\n${deck}`;
  const confirmed: string[] = [];
  const probable: string[] = [];

  // ── Evidence that is conclusive on its own ───────────────────────────────
  const phrases = [...GHOST_PHRASES, ...(input.extraPhrases ?? []).map((p) => p.toLowerCase())];
  for (const phrase of phrases) {
    if (phrase && haystack.includes(phrase)) confirmed.push(`contains "${phrase}"`);
  }

  for (const phrase of GHOST_WEAK_PHRASES) {
    if (haystack.includes(phrase)) probable.push(`contains "${phrase}" (also a real headline)`);
  }

  if (slug && GHOST_SLUG_EXACT.includes(slug)) confirmed.push(`slug is a fixture name ("${slug}")`);

  for (const pattern of GHOST_SLUG_STRONG_PATTERNS) {
    if (pattern.test(slug)) {
      confirmed.push(`slug matches ${pattern}`);
      break;
    }
  }

  if (confirmed.length) return { confidence: "confirmed", reasons: confirmed };

  // ── Evidence a human has to weigh ────────────────────────────────────────
  const prefix = GHOST_SLUG_PREFIXES.find((value) => slug.startsWith(value));
  if (prefix) probable.push(`slug starts with "${prefix}"`);

  for (const pattern of GHOST_SLUG_WEAK_PATTERNS) {
    if (pattern.test(slug)) {
      probable.push(`slug matches ${pattern}`);
      break;
    }
  }

  // Roman Urdu: two distinct markers, counted as whole words across the title
  // and deck. One is a coincidence ("…aur" inside a name); two is a sentence.
  const words = new Set(`${title} ${deck}`.match(/[a-z]+/g) ?? []);
  const romanUrduHits = ROMAN_URDU_TOKENS.filter((token) => words.has(token));
  if (romanUrduHits.length >= 2) {
    probable.push(`Roman Urdu markers: ${romanUrduHits.join(", ")}`);
  }

  if (probable.length) return { confidence: "probable", reasons: probable };
  return null;
}

/** A bucket object as returned by `listR2Objects`. */
export interface SweepableObject {
  key: string;
  size?: number;
  lastModified?: Date | null;
}

export interface OrphanSweepOptions {
  /** Never delete an object younger than this. Guards an in-flight upload. */
  graceMs?: number;
  now?: Date;
}

/**
 * Objects in the bucket that nothing references.
 *
 * `liveKeys` must be built from every surviving reference — the article columns
 * (contentUrl / img / ogImage) *and* everything found inside the content bodies
 * of articles that still exist, in any status. A draft's inline image is a live
 * reference; only objects no row and no body mentions are orphans.
 *
 * The grace window is the safety net for the one race this cannot reason about:
 * an upload that finished before its database write. Without it, an object
 * written a second ago and not yet linked would be deleted while the editor is
 * still looking at the save spinner. An object whose timestamp is missing
 * cannot be aged, so with a grace window in force it is left alone — the
 * conservative reading of "I cannot prove this is old enough to delete".
 */
export function findOrphanObjects(
  objects: readonly SweepableObject[],
  liveKeys: ReadonlySet<string>,
  options: OrphanSweepOptions = {},
): SweepableObject[] {
  const graceMs = options.graceMs ?? 0;
  const now = options.now ?? new Date();

  return objects.filter((object) => {
    if (liveKeys.has(object.key)) return false;

    if (graceMs > 0) {
      if (!object.lastModified) return false;
      const age = now.getTime() - object.lastModified.getTime();
      if (age < graceMs) return false;
    }

    return true;
  });
}
