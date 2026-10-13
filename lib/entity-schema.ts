import { siteConfig } from "@/lib/seo";

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
    url: siteConfig.url,
    logo: siteConfig.logoUrl,
    // Only advertise profiles that verifiably exist for this publication; do
    // not invent handles (SCH-001). Add LinkedIn/YouTube/Wikidata here as
    // those profiles get created — each one strengthens the entity.
    sameAs: [
      `https://x.com/${siteConfig.twitter.replace(/^@/, "")}`,
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
