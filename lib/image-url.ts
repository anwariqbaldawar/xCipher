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
export function optimizeImageUrl(src: string, width: number): string {
  if (!src || !/^https?:\/\//i.test(src)) return src;

  try {
    const url = new URL(src);
    const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE;
    if (!publicBase || new URL(publicBase).origin !== url.origin) return src;
    if (!supportsImageTransformations(publicBase)) return src;
    if (url.pathname.startsWith(TRANSFORM_PATH)) return src;

    const options = `width=${Math.max(1, Math.round(width))},format=auto,quality=82`;
    const path = `${TRANSFORM_PATH}${options}${url.pathname}`;
    return `${url.origin}${path}${url.search}`;
  } catch {
    return src;
  }
}

/** Open Graph / X card size (1.91:1) — what every major network renders as a large preview. */
export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Social-card copy of a public R2 image: exactly 1200×630, cropped around the
 * subject, re-encoded as JPEG through Cloudflare Image Transformations.
 *
 * Why a dedicated copy rather than the stored file:
 *   • uploads are normalised to WebP, which WhatsApp and LinkedIn link
 *     previews do not reliably render — the share degrades to a bare link;
 *   • a stored original can run to several MB (X's card limit is 5 MB, and
 *     WhatsApp's practical limit is far lower);
 *   • og:image:width/height must describe the actual file for Facebook to
 *     draw the image on the very first share — 1200×630 is now guaranteed.
 *
 * Returns null when the source cannot be transformed (not on the configured R2
 * base, or an r2.dev base), so the caller can fall back to the original
 * without declaring dimensions it cannot vouch for.
 */
export function socialCardImageUrl(src: string | null | undefined): string | null {
  if (!src || !/^https?:\/\//i.test(src)) return null;

  try {
    const url = new URL(src);
    const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE;
    if (!publicBase || new URL(publicBase).origin !== url.origin) return null;
    if (!supportsImageTransformations(publicBase)) return null;
    if (url.pathname.startsWith(TRANSFORM_PATH)) return null;

    const { width, height } = SOCIAL_CARD_SIZE;
    const options = `width=${width},height=${height},fit=cover,gravity=auto,format=jpeg,quality=82`;
    return `${url.origin}${TRANSFORM_PATH}${options}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
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
