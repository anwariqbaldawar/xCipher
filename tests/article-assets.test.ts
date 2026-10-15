// ─────────────────────────────────────────────────────────────────────────────
// Article asset extraction
// ─────────────────────────────────────────────────────────────────────────────
//
// These keys are handed to a destructive call, so the tests cover both failure
// directions: everything the editor can embed must be found (an object that is
// missed stays served and indexed forever — the actual bug report), and nothing
// the article does not own may be included (a shared brand asset must not be
// deleted because one story embedded it).

import { describe, expect, it } from "vitest";
import {
  ARTICLE_ASSET_PREFIXES,
  collectArticleAssetKeys,
  extractKeysFromHtml,
  extractKeysFromJson,
  isArticleAssetKey,
} from "@/lib/article-assets";
import { buildDeleteObjectsXml, r2KeyFromUrl } from "@/lib/storage";

const BASE = "https://media.xsypher.com";
const url = (key: string) => `${BASE}/${key}`;

describe("r2KeyFromUrl", () => {
  it("turns a public URL into the bucket key", () => {
    expect(r2KeyFromUrl(url("xsypher/articles/2026/10/a.png"), BASE)).toBe("xsypher/articles/2026/10/a.png");
  });

  it("drops the query string and decodes the path", () => {
    expect(r2KeyFromUrl(`${url("xsypher/articles/homenest%20movers.png")}?v=2`, BASE)).toBe(
      "xsypher/articles/homenest movers.png",
    );
  });

  it("passes a bare key through unchanged", () => {
    expect(r2KeyFromUrl("articles/content-abc.json", BASE)).toBe("articles/content-abc.json");
  });

  it("returns null for anything not in the bucket", () => {
    expect(r2KeyFromUrl("https://images.pexels.com/photos/1/a.jpg", BASE)).toBeNull();
    expect(r2KeyFromUrl("https://media.other-host.com/a.png", BASE)).toBeNull();
    expect(r2KeyFromUrl("data:image/png;base64,AAAA", BASE)).toBeNull();
    expect(r2KeyFromUrl("/local/public-file.png", BASE)).toBeNull();
    expect(r2KeyFromUrl(null, BASE)).toBeNull();
    expect(r2KeyFromUrl("   ", BASE)).toBeNull();
  });

  it("only treats a root-relative path as a key when the base is itself a path", () => {
    expect(r2KeyFromUrl("/cdn/xsypher/a.png", "/cdn")).toBe("xsypher/a.png");
  });
});

describe("extractKeysFromHtml", () => {
  it("finds every attribute a sanitized body can carry an asset in", () => {
    const html = `
      <img src="${url("xsypher/articles/plain.png")}">
      <img data-src="${url("xsypher/articles/lazy.png")}">
      <source srcset="${url("xsypher/articles/wide.png")} 1280w, ${url("xsypher/articles/narrow.png")} 640w">
      <video poster="${url("xsypher/articles/poster.jpg")}"></video>
      <div style="background-image:url('${url("xsypher/articles/bg.png")}')"></div>
      <a href="${url("xsypher/articles/report.pdf")}">the report</a>
    `;
    const keys = extractKeysFromHtml(html, BASE);
    for (const expected of [
      "xsypher/articles/plain.png",
      "xsypher/articles/lazy.png",
      "xsypher/articles/wide.png",
      "xsypher/articles/narrow.png",
      "xsypher/articles/poster.jpg",
      "xsypher/articles/bg.png",
      "xsypher/articles/report.pdf",
    ]) {
      expect(keys, expected).toContain(expected);
    }
  });

  it("ignores external hosts and public files, and de-duplicates", () => {
    const html = `
      <img src="https://images.pexels.com/photos/9/a.jpg">
      <img src="/fallback-cover.webp">
      <img src="${url("xsypher/articles/same.png")}">
      <img src="${url("xsypher/articles/same.png")}">
    `;
    expect(extractKeysFromHtml(html, BASE)).toEqual(["xsypher/articles/same.png"]);
  });

  it("handles entity-escaped URLs", () => {
    expect(extractKeysFromHtml(`<img src="${url("xsypher/articles/a.png")}?w=1&amp;h=2">`, BASE)).toEqual([
      "xsypher/articles/a.png",
    ]);
  });

  it("returns nothing for an empty body", () => {
    expect(extractKeysFromHtml(null, BASE)).toEqual([]);
    expect(extractKeysFromHtml("", BASE)).toEqual([]);
  });
});

describe("extractKeysFromJson", () => {
  it("walks a TipTap document at any depth", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "imageBlock",
          attrs: { src: url("xsypher/articles/one.png"), caption: "not a url" },
          content: [{ type: "gallery", attrs: { graphic: url("xsypher/articles/two.png") } }],
        },
        { type: "embed", attrs: { poster: url("xsypher/articles/three.jpg"), srcset: `${url("xsypher/articles/four.png")} 800w` } },
      ],
    };
    expect(extractKeysFromJson(doc, BASE).sort()).toEqual([
      "xsypher/articles/four.png",
      "xsypher/articles/one.png",
      "xsypher/articles/three.jpg",
      "xsypher/articles/two.png",
    ]);
  });

  it("drops absolute references to other hosts", () => {
    const doc = { attrs: { src: "https://images.pexels.com/photos/4/a.jpg", href: "https://example.com/page" } };
    expect(extractKeysFromJson(doc, BASE)).toEqual([]);
  });

  it("leaves non-asset values to the namespace filter rather than guessing", () => {
    // A TipTap attribute can hold a plain word ("left" for alignment) under a
    // URL-named key. This low-level helper cannot tell that apart from a bare
    // bucket key, so it reports it — and collectArticleAssetKeys() is what
    // discards it, because it is not in an article namespace.
    expect(extractKeysFromJson({ attrs: { src: "left" } }, BASE)).toEqual(["left"]);
    expect(collectArticleAssetKeys({}, { json: { attrs: { src: "left" } } }, BASE)).toEqual([]);
  });
});

describe("collectArticleAssetKeys", () => {
  const article = {
    img: url("xsypher/articles/2026/10/featured.png"),
    ogImage: url("xsypher/articles/2026/10/social.png"),
    contentUrl: "articles/content-abc123.json",
  };

  it("collects the columns plus the media inside the body", () => {
    const keys = collectArticleAssetKeys(
      article,
      {
        html: `<img src="${url("xsypher/articles/2026/10/inline.png")}">`,
        json: { content: [{ attrs: { src: url("xsypher/articles/2026/10/from-json.png") } }] },
      },
      BASE,
    );

    expect(keys.sort()).toEqual([
      "articles/content-abc123.json",
      "xsypher/articles/2026/10/featured.png",
      "xsypher/articles/2026/10/from-json.png",
      "xsypher/articles/2026/10/inline.png",
      "xsypher/articles/2026/10/social.png",
    ]);
  });

  it("keeps the content blob when the payload is empty, so the body is not stranded", () => {
    expect(collectArticleAssetKeys(article, null, BASE).sort()).toEqual([
      "articles/content-abc123.json",
      "xsypher/articles/2026/10/featured.png",
      "xsypher/articles/2026/10/social.png",
    ]);
  });

  it("refuses to claim a shared asset that is not in an article namespace", () => {
    const keys = collectArticleAssetKeys(
      { img: url("xsypher/brand/logo.svg") },
      { html: `<img src="${url("xsypher/brand/wordmark.svg")}"><img src="${url("xsypher/articles/owned.png")}">` },
      BASE,
    );
    expect(keys).toEqual(["xsypher/articles/owned.png"]);
  });

  it("accepts a string payload as HTML, which is what fetchFromR2 returns for some bodies", () => {
    expect(
      collectArticleAssetKeys({ contentUrl: null }, `<img src="${url("xsypher/articles/only.png")}">`, BASE),
    ).toEqual(["xsypher/articles/only.png"]);
  });
});

describe("isArticleAssetKey", () => {
  it("knows the two namespaces the pipeline writes", () => {
    expect(ARTICLE_ASSET_PREFIXES).toContain("xsypher/articles/");
    expect(isArticleAssetKey("xsypher/articles/2026/10/a.png")).toBe(true);
    expect(isArticleAssetKey("articles/content-abc.json")).toBe(true);
    expect(isArticleAssetKey("xsypher/brand/logo.svg")).toBe(false);
    expect(isArticleAssetKey("uploads/legacy.png")).toBe(false);
  });
});

describe("buildDeleteObjectsXml", () => {
  it("escapes keys and forms a valid Delete request body", () => {
    const xml = buildDeleteObjectsXml(["xsypher/articles/a&b.png", 'articles/q"uote.png']);
    expect(xml).toContain("<Delete>");
    expect(xml).toContain("</Delete>");
    expect(xml).toContain("<Key>xsypher/articles/a&amp;b.png</Key>");
    expect(xml).toContain("<Key>articles/q&quot;uote.png</Key>");
    expect(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")).toBe(true);
  });
});
