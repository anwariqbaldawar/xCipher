import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { constructMetadata, PRODUCTION_SITE_URL, siteConfig } from "@/lib/seo";
import { SOCIAL_CARD_SIZE, socialCardImageUrl } from "@/lib/image-url";
import { HTML_LIMITED_BOTS, NEXT_DEFAULT_HTML_LIMITED_BOTS } from "@/lib/html-limited-bots";
import robots from "@/app/robots";

// ─────────────────────────────────────────────────────────────────────────────
// Social sharing metadata for articles (X, Facebook, Threads, WhatsApp, …).
//
// Why shares showed a bare link: the og:image was the stored upload — WebP,
// which WhatsApp and LinkedIn previews do not reliably render, and often
// several MB — declared as 1200×630 whatever its real size; the fallback card
// lived under a robots-disallowed /api/ path that Twitterbot will not fetch;
// and crawlers Next does not recognise got metadata streamed into <body>.
// ─────────────────────────────────────────────────────────────────────────────

const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");
const R2 = "https://media.xsypher.com";

describe("social card image", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE", R2));
  afterEach(() => vi.unstubAllEnvs());

  it("is a 1200×630 JPEG crop of the article's own featured image", () => {
    expect(socialCardImageUrl(`${R2}/2026/02/hero.webp`)).toBe(
      `${R2}/cdn-cgi/image/width=1200,height=630,fit=cover,gravity=auto,format=jpeg,quality=82/2026/02/hero.webp`,
    );
    expect(SOCIAL_CARD_SIZE).toEqual({ width: 1200, height: 630 });
  });

  it("declines anything it cannot transform, so no size is claimed for it", () => {
    expect(socialCardImageUrl(undefined)).toBeNull();
    expect(socialCardImageUrl("/fallback-cover.webp")).toBeNull();
    expect(socialCardImageUrl("https://images.pexels.com/photos/1/a.jpeg")).toBeNull();
    expect(socialCardImageUrl(`${R2}/cdn-cgi/image/width=640/2026/02/hero.webp`)).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE", "https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev");
    expect(socialCardImageUrl("https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev/2026/02/hero.webp")).toBeNull();
  });
});

describe("article og / twitter metadata", () => {
  const card = `${R2}/cdn-cgi/image/width=1200,height=630,fit=cover,gravity=auto,format=jpeg,quality=82/2026/02/hero.webp`;

  it("emits the card as absolute og:image and twitter:image with its true size and type", () => {
    const metadata = constructMetadata({
      title: "Headline", image: card, imageAlt: "Alt text", imageSize: SOCIAL_CARD_SIZE, imageType: "image/jpeg",
      canonical: "/article/headline", type: "article",
    });
    expect(metadata.openGraph.images).toEqual([{ url: card, width: 1200, height: 630, type: "image/jpeg", alt: "Alt text" }]);
    expect(metadata.twitter.images).toEqual([card]);
    expect(metadata.twitter.card).toBe("summary_large_image");
    expect(metadata.openGraph.type).toBe("article");
  });

  it("claims no dimensions for an image whose size is unknown", () => {
    const metadata = constructMetadata({ title: "Headline", image: `${R2}/2026/02/hero.webp`, imageSize: null });
    expect(metadata.openGraph.images![0]).not.toHaveProperty("width");
    expect(metadata.openGraph.images![0]).not.toHaveProperty("height");
  });

  it("keeps every other route's legacy 1200×630 declaration unchanged", () => {
    const metadata = constructMetadata({ title: "AI", image: "/og-fallback.png" });
    expect(metadata.openGraph.images![0]).toMatchObject({ width: 1200, height: 630 });
    expect(metadata.openGraph.images![0]).not.toHaveProperty("type");
  });

  it("resolves everything against metadataBase on the production origin", () => {
    const metadata = constructMetadata({ title: "Headline", image: "/og-fallback.png" });
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(metadata.metadataBase.origin).toBe(new URL(siteConfig.url).origin);
    expect(metadata.openGraph.images![0].url).toBe(`${siteConfig.url}/og-fallback.png`);
    expect(metadata.twitter.images![0]).toMatch(/^https?:\/\//);
  });

  it("wires the article route to the social card, its size and the same origin", () => {
    const source = read("app/(public)/article/[slug]/page.tsx");
    const page = source.slice(source.indexOf("export async function generateMetadata"), source.indexOf("export async function generateStaticParams"));
    expect(page.length).toBeGreaterThan(500);
    expect(page).toContain("socialCardImageUrl(featuredImage)");
    expect(page).toMatch(/resolvedImage = socialCard \|\| featuredImage \|\| ogUrl/);
    expect(page).toMatch(/imageSize,\s*\n\s*imageType,/);
    expect(page).toContain("`${siteConfig.url}/api/og?");
    expect(page).not.toContain('"https://xsypher.com"');
  });
});

describe("production origin", () => {
  it("is the apex host that www permanently redirects to — not the redirecting www host", () => {
    expect(PRODUCTION_SITE_URL).toBe("https://xsypher.com");
    // Pointing canonical/og URLs at www would make every one a redirect.
    expect(read("middleware.ts")).toMatch(/hostname === "www\.xsypher\.com"/);
    expect(read(".github/workflows/deploy.yml")).toContain(`NEXT_PUBLIC_SITE_URL: ${PRODUCTION_SITE_URL}`);
  });
});

describe("crawler access to the generated card", () => {
  it("lets every crawler fetch /api/og while the rest of /api/ stays disallowed", () => {
    const rules = robots().rules as { userAgent: string | string[]; allow?: string | string[]; disallow?: string | string[] }[];
    const general = rules.find(rule => rule.userAgent === "*")!;
    expect(general.allow).toEqual(expect.arrayContaining(["/", "/api/og"]));
    expect(general.disallow).toEqual(expect.arrayContaining(["/api/"]));
  });
});

describe("HTML-limited bots (blocking metadata in <head>)", () => {
  it("is a superset of the installed Next.js defaults", () => {
    const require = createRequire(import.meta.url);
    const { HTML_LIMITED_BOT_UA_RE } = require(path.join(process.cwd(), "node_modules/next/dist/shared/lib/router/utils/html-bots.js"));
    const defaults: string[] = HTML_LIMITED_BOT_UA_RE.source.split("|");
    const ours = new Set<string>(NEXT_DEFAULT_HTML_LIMITED_BOTS);
    expect(defaults.filter(alternative => !ours.has(alternative))).toEqual([]);
  });

  it("sends social crawlers <head> metadata and keeps streaming for browsers", () => {
    for (const ua of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "WhatsApp/2.23.20.0 A",
      "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
      "LinkedInBot/1.0",
      "TelegramBot (like TwitterBot)",
      "Mozilla/5.0 (compatible; Pinterestbot/1.0; +http://www.pinterest.com/bot.html)",
      "Mastodon/4.2.1 (http.rb/5.1.1; +https://mastodon.social/)",
      "Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)",
    ]) expect(HTML_LIMITED_BOTS.test(ua), ua).toBe(true);
    expect(HTML_LIMITED_BOTS.test("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")).toBe(false);
    expect(read("next.config.ts")).toMatch(/htmlLimitedBots:\s*HTML_LIMITED_BOTS/);
  });
});
