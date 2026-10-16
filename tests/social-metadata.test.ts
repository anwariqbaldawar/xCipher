import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Social-preview integrity.
 *
 * The failures this file guards against are the ones a reader sees as "the link
 * showed nothing": a canonical or `og:image` published as `localhost`, an SVG
 * shipped as a card image (X, Threads and WhatsApp reject it and fall back to a
 * bare text link), or a crawler group missing from robots.txt so the preview
 * agent is refused the page.
 */

const PRODUCTION = "https://xsypher.com";

async function loadSeoModule(siteUrl?: string) {
  vi.resetModules();
  if (siteUrl === undefined) {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  } else {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  }
  return import("@/lib/seo");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("canonical origin resolution", () => {
  it("never publishes localhost, even when the env file says localhost", async () => {
    // `.env.example` ships `NEXT_PUBLIC_SITE_URL="http://localhost:3000"`.
    const { siteConfig } = await loadSeoModule("http://localhost:3000");
    expect(siteConfig.url).toBe(PRODUCTION);
    expect(siteConfig.logoUrl.startsWith(PRODUCTION)).toBe(true);
  });

  it("drops loopback variants and non-HTTP protocols", async () => {
    for (const value of [
      "http://127.0.0.1:3000",
      "http://0.0.0.0:3000",
      "http://dev.localhost",
      "http://xsypher.local",
      "file:///tmp/site",
      "not a url",
    ]) {
      const { siteConfig } = await loadSeoModule(value);
      expect(siteConfig.url, value).toBe(PRODUCTION);
    }
  });

  it("normalises the site's own www host to the apex domain it redirects to", async () => {
    const { siteConfig } = await loadSeoModule("https://www.xsypher.com");
    expect(siteConfig.url).toBe(PRODUCTION);
  });

  it("keeps a real staging origin and strips trailing slashes", async () => {
    const staging = await loadSeoModule("https://staging.xsypher.com/");
    expect(staging.siteConfig.url).toBe("https://staging.xsypher.com");

    const unset = await loadSeoModule();
    expect(unset.siteConfig.url).toBe(PRODUCTION);
  });
});

describe("open graph / twitter card output", () => {
  it("emits an absolute, secured 1.91:1 card with a declared type and alt text", async () => {
    const { constructMetadata } = await loadSeoModule();
    const metadata = constructMetadata({
      title: "Secure Boot, Audited",
      image: "https://media.xsypher.com/2026/10/hero.jpg",
      imageAlt: "Secure boot chain diagram",
      canonical: "/article/secure-boot",
    });

    const image = metadata.openGraph.images![0];
    expect(image.url).toBe("https://media.xsypher.com/2026/10/hero.jpg");
    expect(image.secureUrl).toBe(image.url);
    expect(image.type).toBe("image/jpeg");
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.alt).toBe("Secure boot chain diagram");

    expect(metadata.twitter.card).toBe("summary_large_image");
    expect(metadata.twitter.site).toBe("@ThexSypher");
    expect(metadata.twitter.creator).toBe("@ThexSypher");
    expect(metadata.twitter.title).toBe("Secure Boot, Audited");
    // Twitter images stay plain URL strings: the array shape is asserted by the
    // existing article-metadata test in tests/live-search-metadata.test.ts.
    expect(metadata.twitter.images![0]).toBe(image.url);
    expect(metadata.alternates.canonical).toBe(`${PRODUCTION}/article/secure-boot`);
  });

  it("refuses an SVG card and substitutes raster brand art", async () => {
    const { constructMetadata, brandBannerUrl } = await loadSeoModule();
    const metadata = constructMetadata({
      title: "Vector logo",
      image: "https://media.xsypher.com/brand/logo.svg",
    });

    expect(metadata.openGraph.images![0].url).toBe(brandBannerUrl());
    expect(metadata.openGraph.images![0].type).toBe("image/png");
    expect(metadata.twitter.images![0]).toBe(brandBannerUrl());
  });

  it("still emits no image at all for an article with none", async () => {
    const { constructMetadata } = await loadSeoModule();
    const metadata = constructMetadata({ title: "No photograph", image: undefined });
    expect(metadata.openGraph.images).toBeUndefined();
    expect(metadata.twitter.images).toBeUndefined();
  });

  it("does not name a MIME type for a negotiated or extension-less image URL", async () => {
    const { constructMetadata } = await loadSeoModule();
    const transformed = constructMetadata({
      title: "Capped",
      image: "https://media.xsypher.com/cdn-cgi/image/width=1200,format=auto/2026/10/hero.jpg",
    });
    expect(transformed.openGraph.images![0].type).toBeUndefined();

    const generated = constructMetadata({
      title: "Generated",
      image: `${PRODUCTION}/api/og?title=Generated`,
    });
    expect(generated.openGraph.images![0].type).toBeUndefined();
    expect(generated.openGraph.images![0].url).toBe(`${PRODUCTION}/api/og?title=Generated`);
  });
});

describe("robots.txt admits the link-preview crawlers", () => {
  it("declares each social agent, allows page routes and the generated card", async () => {
    vi.resetModules();
    const { default: robots } = await import("@/app/robots");
    const output = robots();
    const groups = Array.isArray(output.rules) ? output.rules : [output.rules];

    const social = groups.find(group => {
      const agents = Array.isArray(group.userAgent) ? group.userAgent : [group.userAgent];
      return agents.includes("Twitterbot") && agents.includes("facebookexternalhit");
    });
    expect(social, "a Twitterbot/facebookexternalhit group must exist").toBeDefined();

    const agents = Array.isArray(social!.userAgent) ? social!.userAgent : [social!.userAgent];
    for (const agent of ["Twitterbot", "facebookexternalhit", "WhatsApp", "Threads", "LinkedInBot"]) {
      expect(agents).toContain(agent);
    }

    const allow = Array.isArray(social!.allow) ? social!.allow : [social!.allow];
    expect(allow).toContain("/");
    // The generated social card is an image endpoint: blocking /api/ for a
    // preview crawler is what leaves an image-less article with no card.
    expect(allow).toContain("/api/og");

    const disallow = Array.isArray(social!.disallow) ? social!.disallow : [social!.disallow];
    expect(disallow).toContain("/admin/");
    expect(disallow).not.toContain("/api/");
  });
});

describe("homepage card resolves to the lead story", () => {
  it("uses the featured story's image and names it in the alt text", async () => {
    const { leadStorySocialCard } = await loadSeoModule();
    const card = leadStorySocialCard({
      title: "Inside the silicon: a teardown of the new edge NPU",
      img: "https://media.xsypher.com/2026/10/silicon-teardown.webp",
    });
    expect(card.image).toBe("https://media.xsypher.com/2026/10/silicon-teardown.webp");
    expect(card.alt).toContain("Inside the silicon");
  });

  it("falls back to the raster brand card for an empty newsroom", async () => {
    const { leadStorySocialCard, brandBannerUrl } = await loadSeoModule();
    expect(leadStorySocialCard(null).image).toBe(brandBannerUrl());
    expect(leadStorySocialCard(undefined).alt).toBe("xSypher — Independent Technology News, Analysis and Reviews");
  });

  it("refuses a stale placeholder and an SVG as the root card", async () => {
    const { leadStorySocialCard, brandBannerUrl } = await loadSeoModule();
    // A retired placeholder row must not become the domain's social image.
    expect(leadStorySocialCard({ title: "Old", img: "https://media.xsypher.com/homenest-movers.png" }).image)
      .toBe(brandBannerUrl());
    expect(leadStorySocialCard({ title: "Vector", img: "https://media.xsypher.com/logo.svg" }).image)
      .toBe(brandBannerUrl());
  });
});
