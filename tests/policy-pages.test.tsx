import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// next/link needs the app-router context, which a static render does not
// provide; the markup under test is the page body, and a plain anchor is what
// Link renders anyway.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import EditorialStandardsPage, { metadata as editorialMetadata } from "@/app/(public)/page/editorial-standards/page";
import CookiePolicyPage, { metadata as cookieMetadata } from "@/app/(public)/page/cookie-policy/page";
import DisclaimerPage, { metadata as disclaimerMetadata } from "@/app/(public)/page/disclaimer/page";
import PrivacyPolicyPage, { metadata as privacyMetadata } from "@/app/(public)/page/privacy-policy/page";

// ─────────────────────────────────────────────────────────────────────────────
// Policy page contract
//
// These routes were rewritten onto a shared shell. Two classes of regression are
// invisible to every other suite here:
//
//   • layout — the old cards kept a `flex-col sm:flex-row` icon column, which
//     from 640px up stole a quarter of the card and squeezed the paragraphs;
//   • copy — a live publication must not ship "demo build" text, and the cookie
//     policy has to describe the advertising cookies the site actually sets.
//
// Rendering the pages is the only way to assert both at once.
// ─────────────────────────────────────────────────────────────────────────────

const pages = [
  { name: "editorial standards", Page: EditorialStandardsPage, metadata: editorialMetadata },
  { name: "cookie policy", Page: CookiePolicyPage, metadata: cookieMetadata },
  { name: "disclaimer", Page: DisclaimerPage, metadata: disclaimerMetadata },
  { name: "privacy policy", Page: PrivacyPolicyPage, metadata: privacyMetadata },
] as const;

const markup = (Page: () => React.ReactElement) => renderToStaticMarkup(React.createElement(Page));

describe("policy pages", () => {
  it.each(pages)("$name renders without demo copy", ({ Page }) => {
    const html = markup(Page);
    expect(html.length).toBeGreaterThan(2000);
    expect(html).not.toMatch(/demo build|demo edition|lorem ipsum|placeholder text|xxx@xsypher/i);
    expect(html).not.toMatch(/localhost/i);
  });

  it.each(pages)("$name spans the body across the card on mobile", ({ Page }) => {
    const html = markup(Page);

    // The shared card: icon + title on row one, body spanning both columns —
    // and only aligned under the title from `md` up.
    expect(html).toContain("grid-cols-[auto_minmax(0,1fr)]");
    expect(html).toContain("col-span-2");
    expect(html).toContain("md:col-start-2");

    // The squeezed icon column is what this replaced: a row layout from 640px
    // up, with the icon in a fixed left column of its own.
    expect(html).not.toMatch(/flex-col sm:flex-row gap-6/);
    expect(html).not.toContain("shrink-0 mt-1");
  });

  it.each(pages)("$name ships section navigation and metadata badges", ({ Page }) => {
    const html = markup(Page);
    expect(html).toContain("On this page"); // desktop rail
    expect(html).toContain("Jump to section"); // touch quick-jump
    expect(html).toContain("Last updated");
  });

  it.each(pages)("$name declares an absolute HTTPS social card", ({ metadata }) => {
    // Next types these as unions of strings, URL objects and descriptors; the
    // assertion is about the emitted string, whatever shape it was built from.
    const image = metadata.openGraph?.images as unknown;
    const first = Array.isArray(image) ? image[0] : image;
    const url = typeof first === "string" ? first : (first as { url?: string } | undefined)?.url;
    expect(url).toMatch(/^https:\/\/xsypher\.com\//);
    expect(url).not.toMatch(/localhost|^\/\//);
    expect(url).not.toMatch(/\.svg(\?|$)/i);

    expect((metadata.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
    expect(metadata.metadataBase?.toString()).toBe("https://xsypher.com/");
    expect(String(metadata.alternates?.canonical)).toMatch(/^https:\/\/xsypher\.com\//);
  });
});

describe("editorial standards — E-E-A-T coverage", () => {
  const html = markup(EditorialStandardsPage);

  it.each([
    ["primary-source verification", /primary source/i],
    ["reproducible benchmark disclosure", /benchmark/i],
    ["byline accountability", /byline|bylines/i],
    ["sponsored and partner labelling", /sponsored/i],
    ["partner content distinction", /partner/i],
    ["AI usage disclosure", /\bAI\b/],
    ["corrections workflow", /correction/i],
    ["anonymous sourcing standard", /anonym/i],
  ])("covers %s", (_label, pattern) => {
    expect(html).toMatch(pattern);
  });

  it("carries the compliance badges the page promises", () => {
    expect(html).toMatch(/Compliance/i);
    expect(html).toMatch(/Applies to/i);
  });
});

describe("cookie policy — AdSense compliance", () => {
  const html = markup(CookiePolicyPage);

  it.each([
    ["the ad vendor", /AdSense|DoubleClick/i],
    ["the ad cookies", /\bIDE\b/],
    ["personalised vs non-personalised", /non-personalised/i],
    ["Google ad settings opt-out", /adssettings\.google\.com/i],
    ["industry opt-out", /aboutads\.info/i],
    ["retention window", /retention/i],
    ["GDPR consent", /GDPR/i],
    ["CCPA rights", /CCPA|CPRA/i],
    ["the consent gate", /consent/i],
  ])("documents %s", (_label, pattern) => {
    expect(html).toMatch(pattern);
  });

  it("no longer claims the site runs no advertising trackers", () => {
    // The copy this replaced insisted there were no third-party advertising
    // cookies at all, which is exactly what AdSense contradicts. (A promise
    // that declining *results in* no advertising cookies is a different
    // sentence and stays.)
    expect(html).not.toMatch(/do not use intrusive/i);
    expect(html).not.toMatch(/do not utilize invasive advertising trackers/i);
    expect(html).not.toMatch(/No Cross-Site Tracking/i);
  });
});

describe("technical disclaimer — clause depth", () => {
  const html = markup(DisclaimerPage);

  it.each([
    ["educational-purpose clause", /educational/i],
    ["dual-use / PoC boundary", /dual-use|proof of concept|PoC/i],
    ["hardware modification liability", /hardware|firmware/i],
    ["90-day disclosure window", /90\s?(?:calendar\s)?days|90-day/i],
    ["safe harbour", /safe harbour|safe harbor/i],
    ["as-is warranty exclusion", /as[- ]is/i],
  ])("keeps %s", (_label, pattern) => {
    expect(html).toMatch(pattern);
  });
});

describe("privacy policy — production copy", () => {
  const html = markup(PrivacyPolicyPage);

  it("describes the processors and rights that are actually used", () => {
    expect(html).toMatch(/processor|sub-processor/i);
    expect(html).toMatch(/GDPR|CCPA/i);
    expect(html).toMatch(/privacy@xsypher\.com/);
  });
});
