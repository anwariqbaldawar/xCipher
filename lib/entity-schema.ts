import { siteConfig, absoluteImageUrl, brandBannerUrl, BRAND_ALTERNATE_NAMES } from "@/lib/seo";
import { BRAND_BANNER_SIZE } from "@/lib/image-url";

function webUrl(value: unknown, base?: string): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim(), base);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function parseAuthorSocialLinks(raw: unknown, includeEmail = false): { platform: string; url: string }[] {
  let value: unknown = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return []; }
  }
  const entries: unknown[] = Array.isArray(value) ? value
    : value && typeof value === "object"
      ? Object.entries(value).map(([platform, url]) => ({ platform, url })) : [];
  return entries.flatMap(entry => {
    if (!entry || typeof entry !== "object" || !("url" in entry)) return [];
    const url = webUrl(entry.url) || (includeEmail && typeof entry.url === "string" && /^mailto:[^\s]+$/i.test(entry.url) ? entry.url : undefined);
    if (!url) return [];
    const platform = "platform" in entry && typeof entry.platform === "string" ? entry.platform : "Website";
    return [{ platform, url }];
  });
}

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": new URL("/#organization", siteConfig.url).href,
    name: siteConfig.name,
    // The phonetic and misspelling variants (xCipher, Cypher, Sypher,
    // xCyper, Cyper …) are alternates of this one entity, so the
    // Knowledge Graph resolves every variant query to xSypher instead
    // of treating them as separate, unaffiliated publications.
    alternateName: BRAND_ALTERNATE_NAMES,
    url: siteConfig.url,
    logo: siteConfig.logoUrl,
    // Only advertise profiles that verifiably exist for this publication; do
    // not invent handles (SCH-001). Add LinkedIn/YouTube/Wikidata here as
    // those profiles get created — each one strengthens the entity.
    sameAs: [
      "https://www.facebook.com/profile.php?id=61594767646306",
      "https://www.threads.net/@thexsypher",
      "https://www.instagram.com/thexsypher",
      "https://www.linkedin.com/company/xsypher/",
      `https://x.com/${siteConfig.twitter.replace(/^@/, "")}`,
      "https://www.reddit.com/r/xsypher/",
      "https://github.com/anwariqbaldawar",
    ],
  };
}

interface AuthorIdentity {
  name: string;
  slug: string;
  role?: string | null;
  avatar?: string | null;
  socialLinks?: unknown;
  bio?: string | null;
  overview?: string | null;
  headline?: string | null;
  expertise?: string | null;
  location?: string | null;
  website?: string | null;
}

export function generatePersonJsonLd(author: AuthorIdentity) {
  const url = new URL(`/author/${encodeURIComponent(author.slug)}`, siteConfig.url).href;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: author.name,
    url,
    jobTitle: author.role?.trim() || "Author",
    image: webUrl(author.avatar, siteConfig.url),
    // SCH-001: tie authors to the publication entity so Knowledge-Graph tools
    // resolve one publisher with named staff rather than a loose profile.
    worksFor: { "@id": new URL("/#organization", siteConfig.url).href },
    sameAs: [...new Set(parseAuthorSocialLinks(author.socialLinks).map(link => link.url))],
  };
}

/* ───────────────────────────────────────────────────────────────────────────────
 * Archive + author structured data
 *
 * Audit context: category and author archives were emitting no page-level
 * schema at all, only the article cards in their markup. Google Images then
 * bound the featured images rendered by those cards to the *archive* URL,
 * because that was the page it found them on with a matching <title>.
 *
 * The rule these builders encode:
 *   • an author profile's primary image is the avatar and nothing else;
 *   • a collection page's primary image is the brand banner;
 *   • neither one ever lists an article's featured image as its own.
 * ─────────────────────────────────────────────────────────────────────────────── */

type ItemListEntry = { url: string; name: string };

/** ItemList of story URLs. Deliberately carries no image nodes. */
export function generateItemListJsonLd(name: string, items: ItemListEntry[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  };
}

function brandBannerObject() {
  return {
    "@type": "ImageObject",
    "@id": `${siteConfig.url}/#primaryimage`,
    url: brandBannerUrl(),
    width: BRAND_BANNER_SIZE.width,
    height: BRAND_BANNER_SIZE.height,
    caption: siteConfig.name,
    name: siteConfig.name,
  };
}

/**
 * ProfilePage for an author archive.
 *
 * `mainEntity`, `image` and `primaryImageOfPage` all resolve to the author's
 * avatar. Article thumbnails appear (if at all) as bare URLs in `hasPart`, with
 * no image node attached, so a crawler cannot read them as this page's visual.
 */
export function generateProfilePageJsonLd(
  author: AuthorIdentity,
  articles: { slug: string; title: string }[] = [],
) {
  const url = new URL(`/author/${encodeURIComponent(author.slug)}`, siteConfig.url).href;
  const avatar = absoluteImageUrl(author.avatar);
  const person = generatePersonJsonLd(author);
  const description = author.overview || author.bio || author.headline || undefined;

  const avatarObject = avatar
    ? {
        "@type": "ImageObject",
        "@id": `${url}#avatar`,
        url: avatar,
        // Avatars are square and small: declaring 400×400 keeps Google from
        // treating a stretched card thumbnail as this profile's image.
        width: 400,
        height: 400,
        caption: author.name,
        name: author.name,
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#profilepage`,
    url,
    name: `${author.name} — ${siteConfig.name}`,
    ...(description ? { description } : {}),
    isPartOf: { "@id": new URL("/#organization", siteConfig.url).href },
    ...(avatarObject
      ? { image: [avatarObject], primaryImageOfPage: avatarObject }
      : {}),
    mainEntity: {
      ...person,
      ...(description ? { description } : {}),
      ...(author.expertise
        ? { knowsAbout: author.expertise.split(",").map(item => item.trim()).filter(Boolean) }
        : {}),
      ...(author.location ? { address: { "@type": "PostalAddress", addressLocality: author.location } } : {}),
      ...(author.website ? { sameAs: [author.website, ...(person.sameAs || [])] } : {}),
    },
    ...(articles.length
      ? { hasPart: generateItemListJsonLd(`${author.name} — published stories`, articles.map(article => ({
          url: `${siteConfig.url}/article/${article.slug}`,
          name: article.title,
        }))) }
      : {}),
  };
}

/**
 * CollectionPage for the homepage, a category or a tag archive.
 *
 * The brand banner is the only image node, so the archive stops competing with
 * the articles whose cards it lists.
 */
export function generateCollectionPageJsonLd({
  url,
  name,
  description,
  items = [],
  includeBrandBanner = true,
}: {
  url: string;
  name: string;
  description?: string;
  items?: ItemListEntry[];
  includeBrandBanner?: boolean;
}) {
  const banner = includeBrandBanner ? brandBannerObject() : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name,
    ...(description ? { description } : {}),
    isPartOf: { "@id": new URL("/#organization", siteConfig.url).href },
    ...(banner
      ? {
          image: [{ ...banner, "@id": `${url}#primaryimage` }],
          primaryImageOfPage: { ...banner, "@id": `${url}#primaryimage` },
        }
      : {}),
    ...(items.length ? { mainEntity: generateItemListJsonLd(name, items) } : {}),
  };
}
