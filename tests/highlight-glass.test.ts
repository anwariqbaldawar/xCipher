import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Inline highlight contract
//
// The <mark> element is styled entirely from app/globals.css — no component
// renders a colour — so nothing in the behavioural suite would notice if the
// opaque flat red came back, or if the glass box started leaking into the Live
// Search dropdown (whose matches share the same tag). These assertions read the
// stylesheet the way the browser will, the same way tests/live-search-ui.test.tsx
// does for the search surfaces.
// ─────────────────────────────────────────────────────────────────────────────

const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

/**
 * The declarations of the rule whose selector list contains `selector`.
 *
 * These rules sit in selector lists (`mark:not(.search-mark),\n.ProseMirror
 * mark, …`), so the selector is located at the start of a line and everything
 * from there to the closing brace is returned — including the other selectors,
 * which is fine for `toMatch` assertions on declarations.
 */
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const from = css.search(new RegExp(`(?:^|\\n)${escaped}\\s*(?:,|\\{)`, "m"));
  expect(from, `expected a rule for ${selector}`).toBeGreaterThan(-1);
  const body = css.slice(from);
  const open = body.indexOf("{");
  const close = body.indexOf("}", open);
  expect(open).toBeGreaterThan(-1);
  return body.slice(open + 1, close);
};

const blockFor = (marker: string, startOf: string) => {
  const from = css.indexOf(startOf);
  expect(from, `expected to find ${startOf}`).toBeGreaterThan(-1);
  return css.slice(from).slice(0, css.slice(from).indexOf(marker));
};

describe("inline highlight glass", () => {
  it("paints the highlight as a translucent glass surface, not a flat fill", () => {
    const mark = rule("mark:not(.search-mark)");

    // The blur is what makes it glass; without it this is just a lighter red.
    expect(mark).toMatch(/-webkit-backdrop-filter:\s*blur\(/);
    expect(mark).toMatch(/backdrop-filter:\s*blur\(4px\)/);

    // Rounded, padded, and framed by a delicate 1px accent rather than a solid
    // block of paint.
    expect(mark).toMatch(/border:\s*1px solid var\(--hl-border\)/);
    expect(mark).toMatch(/border-bottom-color:\s*var\(--hl-border-strong\)/);
    expect(mark).toMatch(/border-radius:\s*6px/);
    expect(mark).toMatch(/padding:\s*0\.08em 0\.34em/);

    // A wrapped highlight has to read as one ribbon.
    expect(mark).toMatch(/box-decoration-break:\s*clone/);

    // The fill is a gradient of two translucent ruby stops, never a single
    // opaque background-color (the old `background-color: var(--bad)`).
    expect(mark).toMatch(/background-color:\s*transparent/);
    expect(mark).toMatch(/background-image:\s*linear-gradient\(180deg,\s*var\(--hl-fill\),?\s*(?:0%,\s*)?var\(--hl-fill-2\)/);
    expect(mark).not.toMatch(/background-color:\s*var\(--bad/);
  });

  it("keeps white highlight text legible in both themes", () => {
    const light = blockFor('[data-theme="dark"]', ":root {");
    const dark = css.slice(css.indexOf('[data-theme="dark"] {')).slice(0, 4000);

    for (const [name, block] of [["light", light], ["dark", dark]] as const) {
      const fill = /--hl-fill:\s*([^;]+);/.exec(block);
      const ink = /--hl-ink:\s*([^;]+);/.exec(block);
      expect(fill, `${name} theme declares --hl-fill`).not.toBeNull();
      expect(ink, `${name} theme declares --hl-ink`).not.toBeNull();
      expect(ink![1].trim()).toBe("#ffffff");

      // rgba(...) with an alpha below 1 — a "glass" fill that is fully opaque
      // would defeat the backdrop-filter it sits on.
      const rgba = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0?\.\d+|1(?:\.0+)?)\s*\)/.exec(fill![1]);
      expect(rgba, `${name} --hl-fill is an rgba() colour`).not.toBeNull();
      const alpha = Number(rgba![1]);
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(1);

      // Light mode carries white text over a near-white page, so it needs the
      // deeper of the two fills; anything lighter than 80% cannot reach 4.5:1.
      if (name === "light") expect(alpha).toBeGreaterThanOrEqual(0.8);
      if (name === "dark") expect(alpha).toBeLessThanOrEqual(0.3);
    }
  });

  it("does not leak the glass box into the Live Search matches", () => {
    // The dropdown matches are <mark> elements too, but they are coloured text
    // on the card surface: no background, no border, no padding, no blur.
    expect(css).toMatch(/mark:not\(\.search-mark\),/);

    const search = rule(".search-mark");
    expect(search).toMatch(/background:\s*transparent/);
    expect(search).toMatch(/color:\s*var\(--accent\)/);
    expect(search).toMatch(/font-weight:\s*700/);
    expect(search).not.toMatch(/border|padding|backdrop-filter/);
  });
});
