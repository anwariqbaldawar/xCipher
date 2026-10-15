import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Glass highlight contract (source-level, like the other stylesheet tests:
// jsdom has no real cascade, so these read app/globals.css the way the
// browser will).
//
// Inline <mark> in the article body and the matched characters in live search
// render as a pane of red-tinted glass. Nothing else may change: the solid red
// Subscribe button, active category pills, drawer items and badges stay as
// they were, and every other <mark> (author bios) keeps the solid fallback.
// ─────────────────────────────────────────────────────────────────────────────

const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");
const css = read("app/globals.css");

// Comments can contain braces and selector-like text; drop them before parsing.
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

type Rule = { selectors: string[]; body: string; index: number };

const selectorList = (prelude: string) => prelude.split(",").map(s => s.trim().replace(/\s+/g, " "));

/** Innermost style rules (selector list + declarations), in source order. */
const rules: Rule[] = [...code.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(match => {
  // A rule that follows `@import …;` statements carries them in its prelude.
  const prelude = match[1].split(";").pop()!.trim();
  return prelude.startsWith("@") ? [] : [{ selectors: selectorList(prelude), body: match[2], index: match.index! }];
});

/** First rule whose complete selector list is exactly `selectors`. */
const find = (selectors: string[]) => rules.find(rule => rule.selectors.join(",") === selectors.join(","));

/** The single rule inside each `@media (forced-colors: active)` block. */
const forcedColors: Rule[] = [
  ...code.matchAll(/@media\s*\(forced-colors:\s*active\)\s*\{\s*([^{}]+)\{([^{}]*)\}\s*\}/g),
].map(match => ({ selectors: selectorList(match[1]), body: match[2], index: match.index! }));

const ARTICLE = [".tiptap-content mark", ".ed-body-content mark"];
const SEARCH = [".search-mark"];
const SEARCH_ACTIVE = [".search-row:hover .search-mark", '.search-row[data-active="true"] .search-mark'];
const GLASS_SELECTORS = [...ARTICLE, ...SEARCH, ...SEARCH_ACTIVE];
const FALLBACK = ["mark", ".ProseMirror mark", ".prose mark", ".ed-body mark"];

const TOKENS = [
  "--hl-glass-fill",
  "--hl-glass-fill-strong",
  "--hl-glass-fill-deep",
  "--hl-glass-sheen",
  "--hl-glass-edge",
  "--hl-glass-specular",
  "--hl-glass-glow",
];

describe("glass highlight — article body and live search only", () => {
  it("applies one glass material to article-body marks and live-search matches", () => {
    const material = find([...ARTICLE, ...SEARCH]);
    expect(material).toBeDefined();
    const body = material!.body;

    // !important because the solid fallback forces background-color with it.
    expect(body).toMatch(/background-color:\s*var\(--hl-glass-fill\)\s*!important/);
    expect(body).toMatch(/background-image:[^;]*var\(--hl-glass-sheen\)[^;]*var\(--hl-glass-fill-deep\)/);

    // Rim and specular edge are inset shadows, not borders: paint only, so a
    // highlight never changes line height or where a line wraps.
    expect(body).toMatch(/inset 0 1px 0 var\(--hl-glass-specular\)/);
    expect(body).toMatch(/inset 0 0 0 1px var\(--hl-glass-edge\)/);
    expect(body).not.toMatch(/(^|[\s;])border\s*:/);

    // A highlight that wraps keeps its rim and radius on every line.
    expect(body).toMatch(/-webkit-box-decoration-break:\s*clone/);
    expect(body).toMatch(/(^|[\s;])box-decoration-break:\s*clone/);

    // No per-mark backdrop-filter: invisible over flat paper, and it would
    // promote every highlight in a long article to its own compositing layer.
    expect(body).not.toMatch(/backdrop-filter/);
  });

  it("keeps the article's own text colour and never paints a solid red block", () => {
    const article = find(ARTICLE);
    expect(article).toBeDefined();
    expect(article!.body).toMatch(/color:\s*inherit\s*!important/);

    for (const rule of [find([...ARTICLE, ...SEARCH])!, article!]) {
      expect(rule.body).not.toMatch(/var\(--bad/);
      expect(rule.body).not.toMatch(/var\(--accent/);
      expect(rule.body).not.toMatch(/#fff(fff)?\b/i);
    }
  });

  it("layers over the solid fallback instead of editing it, and wins on source order", () => {
    // The fallback still serves every other <mark> (author bios, …) unchanged.
    const fallback = find(FALLBACK);
    expect(fallback).toBeDefined();
    expect(fallback!.body).toMatch(/background-color:\s*var\(--bad,\s*#dc2626\)\s*!important/);
    expect(fallback!.body).toMatch(/color:\s*#ffffff\s*!important/);

    // `.tiptap-content mark` and `.prose mark` are both (0,1,1): the glass
    // only wins because it comes later.
    expect(find([...ARTICLE, ...SEARCH])!.index).toBeGreaterThan(fallback!.index);
    expect(find(ARTICLE)!.index).toBeGreaterThan(fallback!.index);
  });

  it("binds to the containers the article surfaces and live search actually render", () => {
    // Public article, draft preview and review pane all render through ArticleBody.
    expect(read("components/article/ArticleBody.tsx")).toMatch(/className="tiptap-content[\s"]/);
    // The article editor's ProseMirror root.
    expect(read("components/editorial/ArticleEditor.tsx")).toMatch(/class:\s*'[^']*\bed-body-content\b/);
    // Live search wraps each matched run in <mark className="search-mark">.
    expect(read("components/search/SearchResultList.tsx")).toMatch(/<mark\b[^>]*className="search-mark"/);

    // Author bios are not article body: they keep the solid fallback.
    for (const file of ["components/author/AuthorProfileView.tsx", "components/article/AuthorBox.tsx", "components/editorial/RichTextField.tsx"]) {
      const source = read(file);
      expect(source, file).not.toContain("tiptap-content");
      expect(source, file).not.toContain("ed-body-content");
    }
  });

  it("confines the glass tokens to those selectors, so no chrome can pick them up", () => {
    const consumers = rules.filter(rule => /var\(--hl-glass-/.test(rule.body));
    expect(consumers.length).toBeGreaterThanOrEqual(3);

    const offenders = consumers.flatMap(rule => rule.selectors).filter(selector => !GLASS_SELECTORS.includes(selector));
    expect(offenders).toEqual([]);
  });

  it("leaves the solid red Subscribe button, category pills, drawer items and badges as they were", () => {
    const body = (selectors: string[]) => find(selectors)?.body ?? "";

    expect(body([".btn-solid"])).toMatch(/background:\s*var\(--accent\)/);
    expect(body([".btn-solid"])).toMatch(/color:\s*#fff\b/);
    expect(body([".navrow a.on"])).toMatch(/background:\s*var\(--accent\)/);
    expect(body([".navrow a.on"])).toMatch(/color:\s*#ffffff\s*!important/);
    expect(body([".navrow .nr-home.on"])).toMatch(/background:\s*var\(--accent\)/);
    expect(body([".drawer nav a:hover", ".drawer nav a.on"])).toMatch(/background:\s*var\(--accent-soft\)/);
    expect(body([".badge"])).toMatch(/background:\s*var\(--accent\)/);

    // …and the brand tokens those rules read are untouched.
    expect(find([":root"])!.body).toMatch(/--accent:\s*#e60000;/);
    expect(find(['[data-theme="dark"]'])!.body).toMatch(/--accent:\s*#ff1a1a;/);
  });

  it("defines every glass token in both themes, as translucent glass", () => {
    for (const [theme, block] of [[":root", find([":root"])!.body], ["dark", find(['[data-theme="dark"]'])!.body]] as const) {
      for (const token of TOKENS) {
        const value = new RegExp(`${token}:\\s*rgba\\(([^)]*)\\)`).exec(block)?.[1];
        expect(value, `${theme} ${token}`).toBeDefined();
        const alpha = Number(value!.split(",")[3]);
        expect(alpha, `${theme} ${token}`).toBeGreaterThan(0);
        expect(alpha, `${theme} ${token}`).toBeLessThan(1);
      }
      expect(block, theme).toMatch(/--hl-glass-ink:\s*#[0-9a-f]{6};/i);
    }
  });

  it("hands every highlight to the system Mark colours in forced-colors mode", () => {
    const covering = (selector: string) => forcedColors.find(block => block.selectors.includes(selector));

    for (const selector of GLASS_SELECTORS) {
      const block = covering(selector);
      expect(block, selector).toBeDefined();
      expect(block!.body).toMatch(/forced-color-adjust:\s*none/);
      expect(block!.body).toMatch(/background:\s*Mark\s*!important/);
      expect(block!.body).toMatch(/color:\s*MarkText\s*!important/);
    }

    // Each block has to follow the rules it overrides, or the translucent
    // glass (and the more specific active-row rule) would win.
    expect(covering(ARTICLE[0])!.index).toBeGreaterThan(find(ARTICLE)!.index);
    expect(covering(SEARCH[0])!.index).toBeGreaterThan(find(SEARCH)!.index);
    expect(covering(SEARCH_ACTIVE[1])!.index).toBeGreaterThan(find(SEARCH_ACTIVE)!.index);
  });
});
