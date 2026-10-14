import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { deriveIsFeatured } from "../lib/utils";

describe("deriveIsFeatured", () => {
  it("returns false for null placement", () => {
    expect(deriveIsFeatured(null)).toBe(false);
  });

  it("returns false for empty string placement", () => {
    expect(deriveIsFeatured("")).toBe(false);
  });

  it("returns true for HERO placement", () => {
    expect(deriveIsFeatured("HERO")).toBe(true);
  });

  it("returns true for FEATURED_STORIES placement", () => {
    expect(deriveIsFeatured("FEATURED_STORIES")).toBe(true);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Hero placement on the public article page
 *
 * The featured image used to sit between the <h1> and the deck; it now closes
 * the header, under the byline and the Listen/Comments bar. Nothing reaches
 * this page without a database, so the contract is pinned on the source: the
 * element order, and the marker + hints the crawler-facing metadata reads.
 * ───────────────────────────────────────────────────────────────────────────── */

describe("article hero placement", () => {
  const page = readFileSync(path.join(process.cwd(), "app/(public)/article/[slug]/page.tsx"), "utf8");

  it("reads headline, deck, byline, action bar, then photograph", () => {
    const headline = page.indexOf('className="art-title"');
    const deck = page.indexOf('className="art-deck"');
    const byline = page.indexOf("<ArticleByline");
    const actions = page.indexOf("<ListenButton />");
    const figure = page.indexOf('<figure className="art-hero');
    const headerEnd = page.indexOf("</header>", figure);

    for (const index of [headline, deck, byline, actions, figure]) {
      expect(index).toBeGreaterThan(-1);
    }
    expect(deck).toBeGreaterThan(headline);
    expect(byline).toBeGreaterThan(deck);
    expect(actions).toBeGreaterThan(byline);
    expect(figure).toBeGreaterThan(actions);
    // Still inside the header, so the body copy begins under the picture.
    expect(headerEnd).toBeGreaterThan(figure);
    expect(page.slice(figure, headerEnd)).not.toContain("<h1");
  });

  it("keeps the marker and the loading hints the metadata and the LCP depend on", () => {
    const figure = page.slice(page.indexOf('<figure className="art-hero'), page.indexOf("</figure>"));
    expect(figure).toContain('data-image-role="featured"');
    // Next 16 renamed `priority` to `preload`; the deprecated prop would no-op.
    expect(figure).toContain("preload");
    expect(figure).not.toMatch(/(^|\s)priority(=|\s|$)/);
    expect(figure).toContain('fetchPriority="high"');
    expect(figure).toContain('sizes="(max-width: 1024px) 100vw, 66vw"');
    expect(figure).toContain("IMAGE_WIDTHS.articleHero");
    expect(figure).toContain("resolveImageSrc");
  });
});
