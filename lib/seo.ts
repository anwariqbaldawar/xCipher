import { getArticleAuthor, type ArticleAuthorSource } from "@/lib/personas";
import { isStaleAsset } from "@/lib/stale-assets";
import {
  BRAND_BANNER_PATH,
  SOCIAL_CARD_SIZE,
  isRasterImageUrl,
  optimizeImageUrl,
  resolveImageSrc,
} from "@/lib/image-url";

/** The production origin. Canonical URLs, `og:url` and every social card. */
const PRODUCTION_SITE_URL = "https://xsypher.com";

/**
 * The origin this deployment must publish in metadata, canonical tags and
 * `metadataBase`.
 *
 * `NEXT_PUBLIC_SITE_URL` is honoured when it points at a real host, because
 * staging deployments need their own origin. What it must never do is leak into
 * production metadata: a value of `http://localhost:3000` — the default in a
 * local `.env`, and exactly what a developer copying `.env.example` gets —
 * would publish `og:url`, `og:image` and every canonical tag as `localhost`,
 * so X, Threads, Facebook and WhatsApp would render a broken or blank preview
 * for the live site, and Google would be handed a non-canonical origin.
 * Loopback hosts and non-HTTP protocols therefore resolve to production.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return PRODUCTION_SITE_URL;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return PRODUCTION_SITE_URL;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return PRODUCTION_SITE_URL;

  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal");
  if (isLoopback) return PRODUCTION_SITE_URL;

  // `www.xsypher.com/*` permanently redirects (308) to the apex domain in
  // next.config.ts. An env value pointing at www would therefore publish a
  // canonical/og:url that immediately redirects elsewhere, which is the one
  // thing a canonical tag must never do. Normalising the site's own domain to
  // its final form keeps canonical, og:url, sitemap and the redirect rules on a
  // single origin; any other host is returned exactly as configured.
  if (host === "www.xsypher.com") parsed.hostname = "xsypher.com";

  // Trailing slashes would produce `https://host//article/...` in every URL
  // built by string concatenation across the app.
  return parsed.href.replace(/\/+$/, "");
}

export const siteConfig = {
  name: "xSypher",
  // Single source of truth for the brand line: used by the <title> template,
  // the RSS channel and anywhere else the positioning is quoted (CON-002).
  tagline: "Independent Technology News, Analysis and Reviews",
  description: "xSypher is an independent technology publication covering AI, cybersecurity, gadgets, software, programming, startups, gaming and the tech business.",
  url: resolveSiteUrl(),
  twitter: "@ThexSypher",
  locale: "en_US",
  publisher: "xSypher Media",
  logoUrl: new URL('/xsypher-logo-full.png', resolveSiteUrl()).href,
};

/**
 * The phonetic and common misspelling variants of the brand name.
 *
 * Readers search for this publication in more ways than the one
 * spelling: xCipher (the name it was founded under), the traditional
 * "cipher" spelling, "sypher", and the phonetic typos xcyper and
 * cyper all reach the site. Listing them as `alternateName` on the
 * Organization and WebSite entities is the schema.org way to tell
 * the Knowledge Graph that every one of those queries resolves to
 * this one entity — without a single redirect or a page per variant.
 *
 * `name` stays exactly "xSypher"; these are alternates, never
 * replacements, so a crawler cannot read the variants as a
 * competing entity.
 */
export const BRAND_ALTERNATE_NAMES: readonly string[] = [
  "xCipher",
  "Cypher",
  "Sypher",
  "xCyper",
  "Cyper",
  "xSypher Tech",
  "xCipher Tech",
  "xsypher.com",
];

/* ───────────────────────────────────────────────────────────────────────────────
 * Image resolution for metadata
 *
 * Audit context: article featured images were surfacing in Google Images under
 * archive page titles ("Ai — xSypher", "Tariq Jameel — xSypher") because every
 * route emitted an og:image, and the archive routes were emitting the *article*
 * cards' images. The rules below encode the fix:
 *
 *   • an article route emits its own featured image, or nothing at all —
 *     never brand art standing in for a photograph that does not exist;
 *   • an archive route (category / tag / home) emits the brand banner;
 *   • an author route emits the author's avatar;
 *   • a known-stale placeholder is refused on every route.
 * ─────────────────────────────────────────────────────────────────────────────── */

/** Absolute URL for an image value, or undefined when it is unusable/stale. */
export function absoluteImageUrl(value?: string | null, base: string = siteConfig.url): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  // A placeholder must never be promoted back onto a public route through the
  // metadata path even if it is still sitting in a row or in settings.
  if (isStaleAsset(trimmed)) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Only a root-relative path can be resolved against the site origin. A bare
  // legacy identifier (a Pexels photo id, say) would otherwise be published as
  // `https://xsypher.com/17483873` — an image URL that 404s. Omitting the tag
  // is the correct answer, exactly as it is for a missing featured image.
  if (!trimmed.startsWith("/")) return undefined;
  return `${base}${trimmed}`;
}

/** Absolute URL of the publication's brand card. */
export function brandBannerUrl(base: string = siteConfig.url): string {
  return `${base}${BRAND_BANNER_PATH}`;
}

/**
 * Final gate before a URL becomes `og:image` / `twitter:image`.
 *
 * Social crawlers are far less forgiving than a browser: X, WhatsApp and
 * Threads reject `image/svg+xml` outright and fall back to a bare text link, so
 * a vector asset in an image slot means no thumbnail at all. A non-raster URL
 * therefore resolves to the raster brand card.
 *
 * The URL is otherwise published exactly as stored, with no width-capped
 * Cloudflare transform in front of it — that is a deliberate constraint, not an
 * oversight. The same URL is the article's `image` in its BlogPosting JSON-LD
 * and the photographed object Google Images indexes; rewriting it here would
 * make the metadata claim a resized derivative the page never displays.
 *
 * Returns `undefined` for an absent value, so a route with no image still emits
 * no tag (see the note in `constructMetadata`).
 */
export function socialCardUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (!isRasterImageUrl(url)) return brandBannerUrl();
  return url;
}

/**
 * The homepage's social card: the lead story's own photograph, not brand art.
 *
 * The root URL was previously published with `/og-fallback.png` — a near-black
 * wordmark card — as its `og:image`. On X that reads as a failed preview, and on
 * Facebook, Threads and WhatsApp it produced the same plain dark rectangle for
 * every share of the domain, so the link looked identical to one with no image
 * at all.
 *
 * A story image is used when one exists: highest-resolution editorial image the
 * lead story has. The brand card remains the fallback for a newsroom with
 * nothing published, for a lead story whose image is a stale placeholder, and
 * for a non-raster (SVG) asset that the networks would reject.
 */
export function leadStorySocialCard(
  lead: { title?: string | null; img?: string | null } | null | undefined,
): { image: string; alt: string } {
  const featured = lead ? articleFeaturedImageUrl(lead) : undefined;
  const title = lead?.title?.trim();
  return {
    image: socialCardUrl(featured) ?? brandBannerUrl(),
    alt: title ? `${title} — featured on ${siteConfig.name}` : `${siteConfig.name} — ${siteConfig.tagline}`,
  };
}

/**
 * MIME type for an `og:image`, when it can be stated truthfully.
 *
 * Two cases deliberately return `undefined` rather than a guess:
 *
 *   • a Cloudflare Image Transformations URL (`/cdn-cgi/image/…`), where
 *     `format=auto` means the wire format depends on the crawler's `Accept`
 *     header, not on the file extension;
 *   • the generated `/api/og` card, whose path carries no extension at all
 *     even though it answers with a PNG.
 *
 * A wrong `og:image:type` is worse than a missing one — Facebook uses the
 * declared type to decide how to fetch, and can drop the image entirely.
 */
function ogImageMimeType(url: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    pathname = url.toLowerCase();
  }
  if (pathname.includes("/cdn-cgi/image/")) return undefined;
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".avif")) return "image/avif";
  return undefined;
}

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image,
  imageAlt,
  twitterImage,
  noIndex = false,
  index,
  follow,
  canonical,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  section,
  tags,
}: {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  /** Optional distinct card for X/Twitter. Defaults to `image`. */
  twitterImage?: string;
  /** Legacy switch: sets both index and follow to false. */
  noIndex?: boolean;
  /** Explicit robots.index. Takes precedence over `noIndex` when provided. */
  index?: boolean;
  /** Explicit robots.follow. Takes precedence over `noIndex` when provided. */
  follow?: boolean;
  canonical?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  /** article:section — the primary section of a story. */
  section?: string;
  /** article:tag — topic chips. */
  tags?: string[];
} = {}) {
  const url = canonical
    ? (canonical.startsWith("http://") || canonical.startsWith("https://")
        ? canonical
        : `${siteConfig.url}${canonical.startsWith("/") ? canonical : `/${canonical}`}`)
    : siteConfig.url;

  const absoluteImage = socialCardUrl(absoluteImageUrl(image));
  const absoluteTwitterImage = twitterImage ? socialCardUrl(absoluteImageUrl(twitterImage)) : absoluteImage;

  // A story with no usable featured image simply has no og:image. Pointing it
  // at the brand banner would make the banner the photograph Google associates
  // with that headline, which is the bug this module exists to prevent.
  const shouldIndex = noIndex ? false : index !== false;
  const shouldFollow = noIndex ? false : follow !== false;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: absoluteImage
        ? [
            {
              url: absoluteImage,
              // `secureUrl` is what the Open Graph protocol wants for an HTTPS
              // image; some crawlers (LinkedIn among them) read it in
              // preference to `og:image`, so both are emitted.
              secureUrl: absoluteImage,
              type: ogImageMimeType(absoluteImage),
              width: SOCIAL_CARD_SIZE.width,
              height: SOCIAL_CARD_SIZE.height,
              alt: imageAlt || title,
            },
          ]
        : undefined,
      locale: siteConfig.locale,
      type,
      ...(type === "article" && {
        publishedTime,
        modifiedTime,
        authors,
        ...(section ? { section } : {}),
        ...(tags && tags.length ? { tags: tags.slice(0, 12) } : {}),
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: absoluteTwitterImage ? [absoluteTwitterImage] : undefined,
      creator: siteConfig.twitter,
      site: siteConfig.twitter,
    },
    robots: {
      index: shouldIndex,
      follow: shouldFollow,
      googleBot: {
        index: shouldIndex,
        follow: shouldFollow,
        // max-image-preview:large is what makes the full-size featured image
        // eligible in Google Images / Discover rather than a 128px thumbnail.
        "max-image-preview": "large" as const,
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    metadataBase: new URL(siteConfig.url),
  };
}

interface NewsArticleSource extends ArticleAuthorSource {
  title: string;
  slug: string;
  deck?: string | null;
  seoTitle?: string | null;
  seoDesc?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  img?: string | null;
  featuredImageAlt?: string | null;
  featuredImageCaption?: string | null;
  featuredImageCredit?: string | null;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  readingTime?: number | null;
  tags?: { tag?: { name?: string | null; slug?: string | null } | null }[] | string[] | null;
}

/** The canonical URL of an article, honouring an editor-set canonical override. */
export function articleCanonicalUrl(article: Pick<NewsArticleSource, "slug" | "canonicalUrl">): string {
  const override = article.canonicalUrl?.trim();
  if (!override) return `${siteConfig.url}/article/${article.slug}`;
  if (/^https?:\/\//i.test(override)) return override;
  return `${siteConfig.url}${override.startsWith("/") ? "" : "/"}${override}`;
}

/**
 * The one image an article page is allowed to present as its primary image:
 * the editorial featured image (`Article.img`) hosted on Cloudflare R2.
 *
 * `ogImage` is deliberately NOT consulted here. It is a social-card override
 * that may be a generated template, and letting it become the article's
 * structured-data image is precisely how a page ends up claiming an image that
 * is not on it.
 */
export function articleFeaturedImageUrl(article: Pick<NewsArticleSource, "img">): string | undefined {
  return absoluteImageUrl(article.img);
}

/**
 * Crawler-facing URL for the featured image.
 *
 * Width-capped through Cloudflare so the bytes Google actually downloads are an
 * appropriately sized, format-negotiated copy of the R2 original rather than a
 * multi-megabyte upload. `optimizeImageUrl` is a no-op for hosts that are not
 * the configured R2 public base, so legacy Pexels artwork is untouched.
 */
export function articleFeaturedCrawlerUrl(article: Pick<NewsArticleSource, "img">): string | undefined {
  const absolute = articleFeaturedImageUrl(article);
  return absolute ? optimizeImageUrl(absolute, 1200) : undefined;
}

function resolveHeadline(article: NewsArticleSource): string {
  return (article.title || "").trim();
}

function articleSeoTitle(article: NewsArticleSource): string | undefined {
  const alternative = (article.metaTitle || article.seoTitle || "").trim();
  return alternative && alternative !== resolveHeadline(article) ? alternative : undefined;
}

function keywordList(article: NewsArticleSource): string[] {
  const tags = article.tags || [];
  return tags
    .map(entry => {
      if (typeof entry === "string") return entry.trim();
      return (entry?.tag?.name || entry?.tag?.slug || "").trim();
    })
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * NewsArticle / BlogPosting structured data for one article.
 *
 * `mainEntityOfPage` and `url` both point at the canonical article URL, and
 * `image` / `primaryImageOfPage` are built from the featured image only — so
 * Google Images has exactly one page to bind that photograph to.
 */
export function generateNewsArticleJsonLd(article: NewsArticleSource) {
  const author = getArticleAuthor(article);
  const headline = resolveHeadline(article) || article.slug;
  const alternativeHeadline = articleSeoTitle(article);
  const description = article.metaDescription || article.seoDesc || article.deck || undefined;
  const canonical = articleCanonicalUrl(article);

  const featured = articleFeaturedCrawlerUrl(article);
  const featuredObject = featured
    ? {
        "@type": "ImageObject",
        "@id": `${canonical}#primaryimage`,
        "url": featured,
        // Width only: the transform preserves the upload's aspect ratio, so
        // declaring a height here would be a guess. Google reads `width` to
        // size the image for a result and `representativeOfPage` to decide
        // whether it is the page's primary visual.
        "width": 1200,
        "representativeOfPage": true,
        "caption": article.featuredImageCaption?.trim() || headline,
        "name": headline,
        ...(article.featuredImageCredit ? { creditText: article.featuredImageCredit } : {}),
      }
    : undefined;

  const mainCategory = article.category?.parent || article.category;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${canonical}#article`,
    "headline": headline,
    ...(alternativeHeadline ? { "alternativeHeadline": alternativeHeadline } : {}),
    ...(description ? { "description": description } : {}),
    // Strictly the featured image. No ogImage, no brand art, no inline body
    // image: those were the sources of the wrong-page attribution.
    ...(featuredObject ? { "image": [featuredObject], "primaryImageOfPage": featuredObject, "thumbnailUrl": featuredObject.url } : {}),
    "datePublished": article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date(article.createdAt).toISOString(),
    "dateModified": new Date(article.updatedAt).toISOString(),
    "author": article.isAnonymous ? {
      "@type": "Organization",
      "name": author.name,
      "url": siteConfig.url,
    } : [{
      "@type": "Person",
      "name": author.name,
      ...(author.slug ? { url: `${siteConfig.url}/author/${author.slug}` } : {}),
    }],
    "publisher": {
      // SCH-001: keep the inline name/logo Google's NewsArticle requirements
      // expect AND link the node to the site-wide Organization entity, so the
      // Knowledge-Graph view sees one publisher rather than two.
      "@type": "Organization",
      "@id": new URL("/#organization", siteConfig.url).href,
      "name": siteConfig.publisher,
      ...(siteConfig.logoUrl ? {
        "logo": {
          "@type": "ImageObject",
          "url": siteConfig.logoUrl
        }
      } : {})
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonical,
      ...(featuredObject ? { "primaryImageOfPage": featuredObject } : {}),
    },
    "url": canonical,
    "isAccessibleForFree": true,
    "inLanguage": "en",
    ...(article.readingTime ? { "timeRequired": `PT${Math.max(1, Math.round(article.readingTime))}M` } : {}),
    ...(mainCategory?.name ? { "articleSection": mainCategory.name } : {}),
    ...(() => {
      const keywords = keywordList(article);
      return keywords.length ? { "keywords": keywords.join(", ") } : {};
    })(),
  };
}

/**
 * The image an article card should show — a width-capped thumbnail, never the
 * full-resolution hero and never a stale placeholder.
 *
 * Exposed here (rather than only in the card components) so the archive pages
 * and the live search results resolve thumbnails through one function.
 */
export function articleCardImage(article: { img?: string | null }, width: number): string {
  return resolveImageSrc(article.img, width);
}
