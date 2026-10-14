// ─────────────────────────────────────────────────────────────────────────────
// Stale / irrelevant asset guard
// ─────────────────────────────────────────────────────────────────────────────
//
// Context: Google Images was attributing the "Homenest Movers" truck PNG to the
// xSypher homepage. That file is not tracked anywhere in this repository (it is
// absent from the working tree, from `public/` and from the full git history of
// `public/`), so it can only enter the rendered HTML from one of three runtime
// sources:
//
//   1. an Article row whose `img` / `ogImage` still points at the file,
//   2. PublicationSettings.defaultOgImage (an editor-pasted social image), or
//   3. a file dropped straight into a deployment's `public/` folder outside git.
//
// Metadata generation cannot see a database row from inside a pure function, but
// it *can* refuse to emit an image it recognises as a known-stale placeholder.
// This module is that refusal, in one place, so every path that turns a stored
// string into a URL for a crawler (OpenGraph, Twitter, JSON-LD, the image
// sitemap, cards) shares one definition of "this must never be published".
//
// `scripts/purge-stale-assets.ts` uses the same list to clean the data itself.
// The guard is the belt; that script is the braces.

/**
 * Substrings (case-insensitive, matched against the decoded path of a URL or a
 * bare storage key) that identify an asset we never want to publish again.
 *
 * Keep these specific. A loose pattern here silently removes editorial images,
 * which is a much worse failure than publishing one stray placeholder.
 */
export const STALE_ASSET_PATTERNS: readonly string[] = [
  "homenest", // the placeholder truck unrelated to any xSypher story
  "movers", // ...and its filename variant
  "logo-4-squares", // a mis-saved screenshot that was used as a "logo" watermark
  "placeholder-cover", // generic third-party placeholder art
  "dummy-image",
  "sample-image",
  "lorem-ipsum",
];

/** Decode what we can without ever throwing on a malformed URL or key. */
function decoded(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** The path/name part of a URL, or the raw string when it is a bare R2 key. */
function assetPath(value: string): string {
  const raw = decoded(value.trim());
  try {
    return new URL(raw).pathname;
  } catch {
    // Not absolute. Strip a query string so `x.webp?w=100` is still matched.
    return raw.split("?")[0];
  }
}

/**
 * True when the value names a known stale or irrelevant asset.
 *
 * Accepts a full URL, a root-relative public path or a bare R2 object key.
 */
export function isStaleAsset(value: string | null | undefined): boolean {
  if (!value) return false;
  const path = assetPath(String(value)).toLowerCase();
  return STALE_ASSET_PATTERNS.some(pattern => path.includes(pattern));
}

/**
 * Passes usable image sources through and drops known-stale ones.
 *
 * Returns `null` rather than a fallback: the caller decides what to render, and
 * a caller that is writing metadata should omit the tag entirely rather than
 * point a crawler at brand art in place of a missing editorial image.
 */
export function rejectStaleAsset<T extends string | null | undefined>(value: T): T | null {
  if (!value) return null;
  return isStaleAsset(String(value)) ? null : value;
}
