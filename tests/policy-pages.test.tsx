// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { siteConfig } from "@/lib/seo";
import { POLICY_HUB } from "@/components/legal/PolicyLayout";
import { resetCookiePreference } from "@/components/common/CookieConsent";
import PrivacyPolicyPage, { metadata as privacyMetadata } from "@/app/(public)/page/privacy-policy/page";
import CookiePolicyPage, { metadata as cookieMetadata } from "@/app/(public)/page/cookie-policy/page";
import EditorialStandardsPage, { metadata as standardsMetadata } from "@/app/(public)/page/editorial-standards/page";
import EditorialPolicyPage, { metadata as policyMetadata } from "@/app/(public)/page/editorial-policy/page";

// ─────────────────────────────────────────────────────────────────────────────
// Standards & Policies hub — E-E-A-T / AdSense policy pages.
//
// The legal pages make factual claims about this codebase (which cookies, which
// consent gate, which processors). These tests bind those claims to the code,
// so renaming a storage key or loosening the ad consent gate fails here and
// prompts the policy update instead of leaving a false statement live.
// ─────────────────────────────────────────────────────────────────────────────

type LinkStubProps = { href: string; children?: ReactNode; prefetch?: unknown } & Record<string, unknown>;
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: LinkStubProps) => {
    const { prefetch, ...anchorProps } = rest;
    void prefetch; // a Next-only prop, not an <a> attribute
    return <a href={href} {...anchorProps}>{children}</a>;
  },
}));

const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");
// JSX turns &rsquo; / &ldquo; into the typographic characters; fold them so
// assertions can be written with plain quotes.
const text = (html: string) => html
  .replace(/<[^>]+>/g, " ")
  .replace(/&rsquo;|&#x27;|&#39;|[\u2018\u2019]/g, "'")
  .replace(/&ldquo;|&rdquo;|&quot;|[\u201C\u201D]/g, '"')
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ");

const pages = {
  "privacy-policy": { Page: PrivacyPolicyPage, metadata: privacyMetadata },
  "cookie-policy": { Page: CookiePolicyPage, metadata: cookieMetadata },
  "editorial-standards": { Page: EditorialStandardsPage, metadata: standardsMetadata },
  "editorial-policy": { Page: EditorialPolicyPage, metadata: policyMetadata },
} as const;
const html = Object.fromEntries(Object.entries(pages).map(([slug, { Page }]) => [slug, renderToStaticMarkup(<Page />)])) as Record<keyof typeof pages, string>;

describe("policy hub layout", () => {
  it.each(Object.keys(pages))("%s renders the hub: tabs, section index and numbered sections", slug => {
    const page = html[slug as keyof typeof pages];
    for (const item of POLICY_HUB) expect(page).toContain(`href="${item.href}"`);
    expect(page.match(/aria-current="page"/g)?.length).toBeGreaterThanOrEqual(1);
    expect(page).toMatch(new RegExp(`href="/page/${slug}" aria-current="page"`));
    const sections = page.match(/class="policy-section"/g) ?? [];
    expect(sections.length).toBeGreaterThanOrEqual(8);
    // Every section is reachable from the index.
    for (const [, id] of page.matchAll(/<section id="([^"]+)" class="policy-section"/g)) expect(page).toContain(`href="#${id}"`);
  });

  it.each(Object.keys(pages))("%s declares its own canonical URL (never the homepage it used to inherit)", slug => {
    const metadata: Metadata = pages[slug as keyof typeof pages].metadata;
    expect(String(metadata.alternates?.canonical)).toBe(`${siteConfig.url}/page/${slug}`);
  });
});

describe("privacy policy — AdSense-ready and true to the code", () => {
  const page = text(html["privacy-policy"]);

  it("carries Google's required advertising disclosures and opt-outs", () => {
    expect(page).toContain("Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.");
    expect(page).toContain("Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.");
    expect(page).toMatch(/DART cookie/);
    for (const url of ["https://adssettings.google.com", "https://optout.aboutads.info", "https://www.youronlinechoices.eu", "https://policies.google.com/technologies/partner-sites"]) {
      expect(html["privacy-policy"]).toContain(`href="${url}"`);
    }
  });

  it("covers consent, collection, legal bases, GDPR and CCPA rights", () => {
    for (const phrase of ["no AdSense code is loaded", "Legal basis (GDPR)", "California (CCPA, as amended by the CPRA)", "We do not sell personal information", "Standard Contractual Clauses", "privacy@xsypher.com"]) {
      expect(page).toContain(phrase);
    }
  });

  it("makes none of the false claims the old page made", () => {
    for (const claim of ["Vercel", "Data Protection Officer", "Argon2", "TLS 1.3", "premium content", "Google Analytics or Plausible"]) {
      expect(page).not.toContain(claim);
    }
  });
});

describe("cookie policy — the inventory matches the code", () => {
  const page = text(html["cookie-policy"]);
  const constant = (file: string, pattern: RegExp) => {
    const match = pattern.exec(read(file));
    expect(match, `${pattern} in ${file}`).not.toBeNull();
    return match![1];
  };

  it("lists every storage key and the session cookie the site actually uses", () => {
    const keys = [
      constant("components/common/CookieConsent.tsx", /const STORAGE_KEY = "([^"]+)"/),
      constant("components/layout/ThemeProvider.tsx", /storageKey="([^"]+)"/),
      constant("components/search/useInstantSearch.ts", /const RECENT_KEY = "([^"]+)"/),
      constant("lib/auth.config.ts", /\? "(__Secure-[^"]+session-token)"/),
      constant("lib/fontSize.ts", /localStorage\.setItem\("([^"]+)"/),
    ];
    for (const key of keys) expect(page, key).toContain(key);
  });

  it("names Google's AdSense cookies, including the DoubleClick DART cookie", () => {
    for (const cookie of ["IDE", "test_cookie", "__gads", "__gpi", "DART cookie"]) expect(page).toContain(cookie);
  });

  it("offers a working way to withdraw consent", () => {
    expect(html["cookie-policy"]).toContain("Cookie settings");
    localStorage.setItem("xsypher-cookie-consent", "accepted");
    const changed = vi.fn();
    window.addEventListener("xsypher-cookie-consent-change", changed);
    resetCookiePreference();
    expect(localStorage.getItem("xsypher-cookie-consent")).toBeNull();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("describes consent gates that really exist", () => {
    // "No AdSense code until Accept": the script and units refuse to render otherwise.
    expect(read("components/common/AdUnit.tsx")).toMatch(/if \(!clientId \|\| preference !== "accepted"\) return null;/);
    // "5% of sessions, text masked, media blocked, only with consent".
    const sentry = read("instrumentation-client.ts");
    expect(sentry).toMatch(/replaysSessionSampleRate: consentGranted \? 0\.05 : 0/);
    expect(sentry).toMatch(/maskAllText: true, blockAllMedia: true/);
  });
});

describe("editorial standards — detailed and consistent", () => {
  const page = text(html["editorial-standards"]);

  it("covers fact-checking, corrections, sponsored-content separation and AI ethics", () => {
    for (const heading of ["How we verify: our fact-checking process", "Corrections, clarifications and updates", "Independence: journalism and paid partnerships", "AI usage ethics"]) {
      expect(page).toContain(heading);
    }
    expect(page).toContain("before the first paragraph");
  });

  it("publishes the same correction response targets as the transparency report", () => {
    const transparency = read("app/(public)/page/transparency/page.tsx");
    const targets = [...transparency.matchAll(/kind: "([^"]+)",[\s\S]*?sla: "([^"]+)"/g)].map(([, kind, sla]) => [kind, sla]);
    expect(targets.length).toBeGreaterThanOrEqual(5);
    for (const [kind, sla] of targets) expect(page, kind).toMatch(new RegExp(`${kind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ${sla}`));
  });
});
