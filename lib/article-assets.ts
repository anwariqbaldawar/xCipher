// ─────────────────────────────────────────────────────────────────────────────
// Article asset extraction
// ─────────────────────────────────────────────────────────────────────────────
//
// Where the R2 keys of a story actually live. An article owns four kinds of
// object in the bucket:
//
//   1. its content blob      — `articles/content-<id>.json` (article.contentUrl)
//   2. its featured image    — article.img (a full public URL)
//   3. its social image      — article.ogImage (a full public URL, when set)
//   4. every inline image    — inside the content blob, in the sanitized HTML
//                              and in the TipTap JSON
//
// (4) is where the previous deletion code leaked. It looked for two patterns,
// `"src": "…"` in the JSON and `src="…"` in the HTML, so a `srcset` candidate, a
// lazy-loaded `data-src`, a video `poster`, a CSS `url()` inside an inline
// style, or an image referenced through a different attribute name was never
// deleted. Uploads are also content-addressed per file, so nothing else in the
// system would ever collect them either.
//
// This module is deliberately pure: it takes the stored values and the content
// payload and returns keys. No database, no network, no bucket — which is what
// makes the decision testable and safe to run before a destructive call.

import { r2KeyFromUrl } from "./storage";

/**
 * The bucket namespaces the article pipeline writes to.
 *
 * `xsypher/articles/` is every editor upload and every external image mirrored
 * through /api/upload/external; `articles/` holds the content blobs
 * (`articles/content-<id>.json`).
 *
 * Deletion is scoped to these on purpose. Article body markup can reference any
 * URL in the bucket — an inlined brand logo, a shared chart — and "the article
 * mentions it" is not the same as "the article owns it": deleting a shared asset
 * because one story embedded it would break every other page still using it.
 * Objects outside these namespaces are left alone; the sweep reports them
 * instead, and a shared file that nothing references is a bucket-hygiene
 * decision rather than a deletion side effect.
 */
export const ARTICLE_ASSET_PREFIXES = ["xsypher/articles/", "articles/"] as const;

/** True when a bucket key is owned by the article pipeline. */
export function isArticleAssetKey(key: string, prefixes: readonly string[] = ARTICLE_ASSET_PREFIXES): boolean {
  return prefixes.some((prefix) => key.startsWith(prefix));
}

/** Attributes that can carry an image/video asset in sanitized article HTML. */
const URL_ATTRIBUTES = [
  "src",
  "data-src",
  "data-original",
  "data-lazy-src",
  "poster",
  "srcset",
  "data-srcset",
  "content", // <meta content> and SVG <image xlink:href> variants
  "href", // <image> inside inline SVG, and media <source>
  "xlink:href",
];

/** Keys inside TipTap JSON that hold a URL (checked at any depth). */
const JSON_URL_KEYS = new Set([
  "src",
  "href",
  "url",
  "poster",
  "srcset",
  "data-src",
  "capture",
  "graphic",
  "thumbnail",
]);

/** Content payload as stored in the bucket ({ html, json }), or either half. */
export interface ArticleContentPayload {
  html?: unknown;
  json?: unknown;
}

/**
 * Every R2 key referenced by a blob of sanitized article HTML.
 *
 * `srcset` is a comma-separated candidate list (`url 640w, url 1024w`), so each
 * candidate is split out before the URL is resolved; a single URL taking the
 * whole attribute is just the one-candidate case.
 */
export function extractKeysFromHtml(html: string | null | undefined, publicBase?: string): string[] {
  if (!html) return [];
  const keys: string[] = [];
  const push = (value: string) => {
    const key = r2KeyFromUrl(decodeHtmlEntities(value.trim()), publicBase);
    if (key) keys.push(key);
  };

  for (const attribute of URL_ATTRIBUTES) {
    // Single/double quotes and unquoted values all appear in real content.
    const pattern = new RegExp(`${attribute}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "gi");
    for (const match of html.matchAll(pattern)) {
      const raw = match[2] ?? match[3] ?? match[4] ?? "";
      if (attribute === "srcset" || attribute === "data-srcset") {
        for (const candidate of raw.split(",")) {
          const url = candidate.trim().split(/\s+/)[0];
          if (url) push(url);
        }
      } else {
        push(raw);
      }
    }
  }

  // Inline styles (`style="background-image: url(...)"`) and <style> blocks.
  for (const match of html.matchAll(/url\(\s*("([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
    const raw = match[2] ?? match[3] ?? match[4] ?? "";
    push(raw);
  }

  return [...new Set(keys)];
}

/**
 * Every R2 key referenced anywhere in a TipTap document.
 *
 * Walked as data rather than matched with a regex: the document is JSON we
 * control, attributes are added over time (the repo has had `graphic`,
 * `code`, `pros`, `categories`, `src`, `poster`), and a regex tuned to today's
 * attribute list is exactly how the previous version came to miss files.
 */
export function extractKeysFromJson(node: unknown, publicBase?: string): string[] {
  const found = new Set<string>();

  const visit = (value: unknown, depth: number) => {
    if (depth > 40 || value == null) return;

    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1);
      return;
    }

    if (typeof value === "string") return;

    if (typeof value === "object") {
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (typeof entry === "string" && JSON_URL_KEYS.has(key)) {
          if (key === "srcset") {
            for (const candidate of entry.split(",")) {
              const url = candidate.trim().split(/\s+/)[0];
              const resolved = url ? r2KeyFromUrl(url, publicBase) : null;
              if (resolved) found.add(resolved);
            }
          } else {
            const resolved = r2KeyFromUrl(entry, publicBase);
            if (resolved) found.add(resolved);
          }
        } else {
          visit(entry, depth + 1);
        }
      }
    }
  };

  visit(node, 0);
  return [...found];
}

/** Anything an article can point at in the bucket. */
export interface ArticleAssetSource {
  img?: string | null;
  ogImage?: string | null;
  contentUrl?: string | null;
}

/**
 * The complete set of R2 keys a deletion has to remove for one article.
 *
 * The content blob itself is always included when `contentUrl` is set, even if
 * the payload could not be read: leaving the body of a deleted story in the
 * bucket is the same class of bug as leaving its pictures.
 */
export function collectArticleAssetKeys(
  source: ArticleAssetSource,
  payload: ArticleContentPayload | string | null | undefined,
  publicBase?: string,
  prefixes: readonly string[] = ARTICLE_ASSET_PREFIXES,
): string[] {
  const keys = new Set<string>();
  const add = (value: string | null | undefined) => {
    const key = r2KeyFromUrl(value ?? null, publicBase);
    if (key && isArticleAssetKey(key, prefixes)) keys.add(key);
  };

  add(source.img);
  add(source.ogImage);
  // The content blob is the article's own body; it is always removed.
  add(source.contentUrl);

  if (typeof payload === "string") {
    for (const key of extractKeysFromHtml(payload, publicBase)) add(key);
  } else if (payload && typeof payload === "object") {
    const { html, json } = payload as ArticleContentPayload;
    if (typeof html === "string") {
      for (const key of extractKeysFromHtml(html, publicBase)) add(key);
    }
    if (json != null) {
      for (const key of extractKeysFromJson(json, publicBase)) add(key);
    }
  }

  return [...keys];
}

/** Minimal entity decoding — enough for the handful that appear in URLs. */
function decodeHtmlEntities(value: string): string {
  if (!value.includes("&")) return value;
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
