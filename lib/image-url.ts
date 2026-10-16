import { getImgSrc } from "@/lib/utils";
import { rejectStaleAsset } from "@/lib/stale-assets";

const TRANSFORM_PATH = "/cdn-cgi/image/";

/**
 * Hosts that cannot serve Cloudflare Image Transformations, so they must never
 * be asked to.
 *
 *   • `*.r2.dev` — the bucket's public *developer* endpoint. It serves objects
 *     and nothing else, so a `/cdn-cgi/image/…` path there is a plain key
 *     lookup that does not exist. That 404 is what the browser logs as
 *     "upstream image response failed".
 *   • `*.r2.cloudflarestorage.com` — the S3 API endpoint, same story.
 *
 * Transformations are a zone feature: they need a custom domain proxied through
 * Cloudflare (`media.xsypher.com` in production, which is why the rule looks at
 * the configured base rather than assuming one).
 */
const UNTRANSFORMABLE_HOSTS = [/\.r2\.dev$/i, /\.r2\.cloudflarestorage\.com$/i];

/**
 * Whether URLs from this public base can be run through
 * `/cdn-cgi/image/<options>/<key>`. Exported so the decision is testable and so
 * a deployment can assert what it is actually configured with.
 */
export function supportsImageTransformations(publicBase: string): boolean {
  try {
    const { hostname } = new URL(publicBase);
    return !UNTRANSFORMABLE_HOSTS.some(pattern => pattern.test(hostname));
  } catch {
    return false;
  }
}

/* ───────────────────────────────────────────────────────────────────────────────
 * Brand + fallback imagery
 *
 * Three different images were being conflated before this module existed: the
 * editorial featured image, the generated OG card and a generic placeholder.
 * Naming them here means each route can state which one it is allowed to
 * publish, which is exactly what Google Images needs in order to stop
 * attributing an archive page's card thumbnail to the article itself.
 * ─────────────────────────────────────────────────────────────────────────────── */

/**
 * The publication's brand card (1200×630, xSypher wordmark on near-black).
 * Used for routes that have no single editorial image of their own: the
 * homepage, category and tag archives. Never for an article.
 */
export const BRAND_BANNER_PATH = "/og-fallback.png";

/** Dimensions of {@link BRAND_BANNER_PATH}. Social cards are 1.91:1. */
export const BRAND_BANNER_SIZE = { width: 1200, height: 630 } as const;

/**
 * Neutral editorial placeholder for a published article that has no featured
 * image at all (or whose stored image was a stale placeholder we refuse to
 * serve). Deliberately not brand art: a story card should never make a
 * crawler believe the brand banner is that story's photograph.
 */
export const ARTICLE_FALLBACK_COVER = "/fallback-cover.webp";

/**
 * Routes public R2 images through Cloudflare Image Transformations so the
 * browser — and every crawler — receives a width-capped, AVIF/WebP-negotiated
 * copy instead of the full-resolution original.
 *
 * When the configured public base is a host that cannot transform (see
 * {@link UNTRANSFORMABLE_HOSTS}) the stored URL is returned unchanged: serving
 * a full-size image is a performance problem, serving a 404 is a broken page.
 *
 * Non-HTTP sources (for example blob previews) remain unchanged.
 */
export function optimizeImageUrl(src: string, width: number, format: OutputFormat = "auto"): string {
  if (!src || !/^https?:\/\//i.test(src)) return src;

  try {
    const url = new URL(src);
    const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE;
    if (!publicBase || new URL(publicBase).origin !== url.origin) return src;
    if (!supportsImageTransformations(publicBase)) return src;
    if (url.pathname.startsWith(TRANSFORM_PATH)) return src;

    const options = `width=${Math.max(1, Math.round(width))},format=${format},quality=82`;
    const path = `${TRANSFORM_PATH}${options}${url.pathname}`;
    return `${url.origin}${path}${url.search}`;
  } catch {
    return src;
  }
}

/**
 * Output format for a Cloudflare Image Transformation.
 *
 * `auto` lets the edge negotiate AVIF/WebP, which is right for a browser
 * (smaller bytes, universal support there) and wrong for a social scraper: X
 * documents JPEG/PNG/WebP/GIF for `twitter:image` and renders nothing for a
 * format it cannot decode, which is exactly the "link with no card" symptom.
 * Card images therefore ask for `jpeg` explicitly.
 */
export type OutputFormat = "auto" | "jpeg" | "png" | "webp";

/** Canonical social/OpenGraph card width. */ 
export const SOCIAL_CARD_WIDTH = 1200;

/**
 * The URL a social crawler should fetch for a stored image.
 *
 * Deliberately a different function from {@link optimizeImageUrl} with `auto`:
 * the card path needs a guaranteed-decodable raster at a bounded size (a
 * 6 MB original can be refused by the scraper outright) while the page itself
 * wants the smallest modern format the reader's browser can paint.
 */
export function socialCardImageUrl(src: string, width: number = SOCIAL_CARD_WIDTH): string {
  return optimizeImageUrl(src, width, "jpeg");
}

/**
 * Single entry point for turning a stored image value into something safe to
 * put in an `<img src>`.
 *
 * The stored value can be, in practice:
 *   • an absolute R2 URL   → width-capped through Cloudflare, stale assets dropped
 *   • a legacy Pexels URL or bare numeric photo id → passed through / expanded
 *   • a root-relative public asset ("/tariq.webp") → passed through untouched
 *     (`getImgSrc` would have produced `…/pexels-photo-NaN.jpeg`)
 *
 * Anything missing, empty or recognised as a stale placeholder resolves to the
 * neutral article cover, so an article card can never render 0-width, a broken
 * image, or the wrong picture.
 *
 * Callers that are writing *metadata* must not use this fallback — see
 * `resolveMetadataImage` in `lib/seo.ts`, which omits the tag instead.
 */
export function resolveImageSrc(
  src: string | null | undefined,
  width: number,
  height?: number,
  fallback: string = ARTICLE_FALLBACK_COVER,
): string {
  const clean = rejectStaleAsset(src);
  if (!clean) return fallback;

  const value = String(clean).trim();
  if (!value) return fallback;

  // Public/relative asset: nothing to transform.
  if (value.startsWith("/") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return optimizeImageUrl(value, width);
  }

  // Pre-R2 legacy rows store a bare Pexels photo id instead of a URL. That is
  // the ONLY non-URL form honoured here: blanking it would delete a live
  // featured image, and the purge script lists any row still holding one so the
  // migration can be finished deliberately (see scripts/purge-stale-assets.ts).
  if (/^\d+$/.test(value)) {
    // `getImgSrc` answers "" for an id it cannot expand (0, say); that is the
    // fallback case, not an empty `src`.
    return getImgSrc(value, width, height ?? Math.round(width * 0.625)) || fallback;
  }

  // Anything else that is not a URL is not an image this site can serve.
  return fallback;
}

/**
 * Canonical thumbnail width per surface.
 *
 * Archive cards render in a 3-4 column grid at ≤ 360 CSS px, so they have no
 * business pulling a 1400 px hero. Keeping the numbers in one table makes the
 * "archives are lighter than the article page" rule auditable rather than a
 * property of whichever component someone edits next.
 */
export const IMAGE_WIDTHS = {
  /** Featured image on an article page (the page's primary image). */
  articleHero: 1400,
  /** Lead story / category hero card. */
  cardHero: 960,
  /** Standard grid card (StoryCard). */
  card: 640,
  /** Horizontal row thumbnail (StoryRow, search results). */
  row: 300,
  /** Smallest chrome — avatars inside bylines. */
  avatarSmall: 64,
} as const;
