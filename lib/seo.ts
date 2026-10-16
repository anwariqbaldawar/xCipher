import { getArticleAuthor, type ArticleAuthorSource } from "@/lib/personas";
import { isStaleAsset } from "@/lib/stale-assets";
import { BRAND_BANNER_PATH, optimizeImageUrl, resolveImageSrc, socialCardImageUrl } from "@/lib/image-url";

/** The canonical production origin. Apex, because the middleware 308-redirects
 *  `www.xsypher.com` to `xsypher.com` — a social card pointing at the www host
 *  would spend a redirect before the crawler ever saw the image. */
export const CANONICAL_ORIGIN = "https://xsypher.com";

/**
 * Resolve the site origin from the environment.
 *
 * `NEXT_PUBLIC_SITE_URL` is unset on plenty of deployments, and when it *is*
 * set in a preview or staging build it is routinely `http://localhost:3000`.
 * Either value leaking into metadata is what produces the two classic social
 * bugs: `og:image` of `https://xsypher.com/og.png` on a preview host (fine) but
 * a *relative* `og:image` on a build where the variable is absent, and a
 * `localhost` image URL in production, which no crawler can fetch and which
 * therefore renders as a bare text link on X.
 *
 * The rules: a real http(s) origin wins, except a loopback/private host or an
 * insecure origin once NODE_ENV is production — those fall back to the
 * canonical apex. Nothing here rewrites a legitimate custom domain.
 */
export function resolveSiteUrl(raw: string | undefined | null = process.env.NEXT_PUBLIC_SITE_URL): string {
  const trimmed = raw?.trim();
  if (!trimmed) return CANONICAL_ORIGIN;

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return CANONICAL_ORIGIN;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return CANONICAL_ORIGIN;

  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local");

  // In production a loopback or plaintext origin cannot be crawled, cannot be
  // fetched by a social scraper and would break every canonical URL on the
  // site. Fall back rather than publish it.
  if (process.env.NODE_ENV === "production" && (isLoopback || parsed.protocol === "http:")) {
    return CANONICAL_ORIGIN;
  }

  return `${parsed.protocol}//${parsed.host}`;
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
  logoUrl: new URL("/xsypher-logo-full.png", resolveSiteUrl()).href,
};

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

/** Raster formats every social scraper renders. SVG is excluded on purpose:
 *  X, Facebook and WhatsApp do not rasterise it, so an SVG in `og:image` is the
 *  same as having no image — and this repository can still explain that a
 *  featured image must be PNG/JPEG/WebP. */
const SOCIAL_RASTER = /\.(?:png|jpe?g|webp|gif|avif)(?:$|[?#])/i;

/**
 * The image value a social card may publish.
 *
 * Layered on {@link absoluteImageUrl} so a stale placeholder, a bare photo id
 * and a missing value are all refused once, in one place. On top of that:
 *
 *   • the URL is forced to HTTPS in production — X and Facebook will not fetch
 *     an `http://` card image from an HTTPS page, and the resulting silence is
 *     indistinguishable from "no thumbnail";
 *   • a non-raster extension is refused, because a logo SVG in `og:image`
 *     renders as a text-only link on every platform that matters here;
 *   • an empty result means "emit no tag", never a brand banner standing in for
 *     a photograph that does not exist (the Google Images fix, unchanged).
 */
export function socialImageUrl(value?: string | null, base: string = siteConfig.url): string | undefined {
  const absolute = absoluteImageUrl(value, base);
  if (!absolute) return undefined;

  // Callers may legitimately pass the generated card (`/api/og?...`), which has
  // no file extension at all — only an explicit, non-raster file extension is
  // rejected.
  const path = (() => {
    try {
      return new URL(absolute).pathname;
    } catch {
      return absolute;
    }
  })();
  const lastSegment = path.split("/").pop() || "";
  if (lastSegment.includes(".") && !SOCIAL_RASTER.test(absolute)) return undefined;

  if (process.env.NODE_ENV === "production" && absolute.startsWith("http://")) {
    return `https://${absolute.slice("http://".length)}`;
  }

  return absolute;
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

  const absoluteImage = socialImageUrl(image);
  const absoluteTwitterImage = twitterImage ? socialImageUrl(twitterImage) : absoluteImage;

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
              width: 1200,
              height: 630,
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

/**
 * The featured image as a social card: absolute, HTTPS, width-capped and
 * negotiated to JPEG (see `socialCardImageUrl` for why the format is pinned).
 *
 * Scrapers are less forgiving than a browser and less patient than Googlebot.
 * A multi-megabyte PNG original can simply be refused by X, and the result
 * looks identical to a site with no card at all — which is the report this
 * function exists to answer. Where the configured media base cannot run
 * transformations the stored URL is returned unchanged, so this is a
 * best-effort optimisation, never a 404.
 */
export function articleFeaturedSocialUrl(article: Pick<NewsArticleSource, "img">): string | undefined {
  const absolute = articleFeaturedImageUrl(article);
  if (!absolute) return undefined;

  const card = socialCardImageUrl(absolute);
  // The card URL is derived locally, so it still passes through the same
  // HTTPS/raster/placeholder gate as every other metadata image.
  return socialImageUrl(card);
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
