import type { MetadataRoute } from "next";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { siteConfig } from "@/lib/seo";

/**
 * robots.txt rendering.
 *
 * The file once disallowed /_next/ and /*?_rsc=*, which stopped
 * Googlebot's renderer from fetching the stylesheets, fonts,
 * scripts and optimised images a page needs — the crawler saw
 * unstyled HTML and mobile-friendliness tanked. These tests
 * lock the fix in: build output is crawlable, and Disallow is
 * reserved for private administration, internal API and
 * single-use token endpoints.
 */

function serialise(rules: MetadataRoute.Robots): string {
  const lines: string[] = [];
  const ruleList = Array.isArray(rules.rules) ? rules.rules : [rules.rules];
  for (const rule of ruleList) {
    const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
    for (const agent of agents) lines.push(`User-agent: ${agent}`);
    const allows = (Array.isArray(rule.allow) ? rule.allow : [rule.allow]).filter(Boolean);
    for (const allow of allows) lines.push(`Allow: ${allow}`);
    const disallows = (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]).filter(Boolean);
    for (const disallow of disallows) lines.push(`Disallow: ${disallow}`);
  }
  lines.push(`Sitemap: ${rules.sitemap}`);
  return lines.join("\n");
}

describe("robots.txt", () => {
  const rendered = robots();
  const text = serialise(rendered);

  it("keeps the canonical sitemap declaration", () => {
    expect(rendered.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });

  it("never blocks the Next.js build output", () => {
    expect(text).not.toContain("Disallow: /_next/");
    expect(text).not.toContain("Disallow: /*?_rsc=*");
  });

  it("explicitly allows static assets and the image optimiser", () => {
    expect(text).toContain("Allow: /_next/static/");
    expect(text).toContain("Allow: /_next/image");
  });

  it("allows Googlebot and Googlebot-Image full asset access", () => {
    const googlebot = text.split("User-agent: Googlebot-Image")[0] + "User-agent: Googlebot-Image";
    expect(text).toContain("User-agent: Googlebot\n");
    expect(googlebot).toContain("Allow: /_next/static/");
    expect(googlebot).toContain("Allow: /_next/image");
  });

  it("allows the social rendering crawlers explicitly", () => {
    for (const agent of ["Googlebot", "Googlebot-Image", "Twitterbot", "facebookexternalhit", "WhatsApp", "LinkedInBot"]) {
      expect(text).toContain(`User-agent: ${agent}`);
    }
  });

  it("restricts Disallow rules to private admin, internal API and token endpoints", () => {
    const disallows = text
      .split("\n")
      .filter((line) => line.startsWith("Disallow: "))
      .map((line) => line.replace("Disallow: ", ""));

    for (const path of disallows) {
      expect(path).not.toMatch(/^\/?_next/);
      expect(path).not.toContain("_rsc");
      expect(path).not.toBe("/api/");
      expect(path).not.toBe("/search");
    }

    // Every disallowed path is private by design.
    const allowed = new Set([
      "/admin/",
      "/api/admin/",
      "/api/auth/",
      "/auth/",
      "/preview/",
      "/invite",
      "/unsubscribe",
    ]);
    for (const path of disallows) {
      expect(allowed.has(path)).toBe(true);
    }
  });

  it("keeps the link-preview agents able to fetch the social card", () => {
    expect(text).toContain("Allow: /api/og");
  });
});
