// ─────────────────────────────────────────────────────────────────────────────
// Article asset extraction
// ─────────────────────────────────────────────────────────────────────────────
//
// These keys are fed to a destructive call. A key that is missed leaves an
// orphan in the bucket forever (this is the Homenest truck image class of bug),
// and a key that is invented deletes somebody else's file, so both directions
// are pinned here: every reference shape the editor can produce resolves to a
// key, and anything hosted elsewhere resolves to nothing at all.

import { describe, expect, it } from "vitest";
import {
  collectArticleAssetKeys,
  extractKeysFromHtml,
  extractKeysFromJson,
} from "@/lib/article-assets";
import { buildDeleteObjectsXml, r2KeyFromUrl } from "@/lib/storage";

const BASE = "https://media.xsypher.test";
const url = (key: string) => `${BASE}/${key}`;

describe("r2KeyFromUrl", () => {
  it("resolves a URL on the configured public base", () => {
    expect(r2KeyFromUrl(url("xsypher/articles/hero.png"), BASE)).toBe("xsypher/articles/hero.png");
  });

  it("strips the query string and fragment, and decodes escapes", () => {
    expect(r2KeyFromUrl(`${url("xsypher/articles/homenest%20truck.png")}?w=640#top`, BASE)).toBe(
      "xsypher/articles/homenest truck.png",
    );
  });

  it("refuses a foreign host so an external image is never sent to a delete call", () => {
    expect(r2KeyFromUrl("https://images.pexels.com/photos/123/truck.jpg", BASE)).toBeNull();
    // Same key, wrong bucket.
    expect(r2KeyFromUrl("https://media.other.test/xsypher/articles/hero.png", BASE)).toBeNull();
  });

  it("refuses non-bucket values", () => {
    expect(r2KeyFromUrl("data:image/png;base64,AAAA", BASE)).toBeNull();
    expect(r2KeyFromUrl("", BASE)).toBeNull();
    expect(r2KeyFromUrl(null, BASE)).toBeNull();
  });
});

describe("extractKeysFromHtml", () => {
  it("finds every attribute shape the sanitizer preserves", () => {
    const html = `
      <p><img src="${url("xsypher/articles/a.png")}" alt="a"></p>
      <p><img data-src='${url("xsypher/articles/lazy.png")}' alt="lazy"></p>
      <p><img src=${url("xsypher/articles/unquoted.png")} alt="unquoted"></p>
      <video poster="${url("xsypher/articles/poster.jpg")}"></video>
      <p><img data-original="${url("xsypher/articles/original.png")}" alt="original"></p>
    `;
    expect(extractKeysFromHtml(html, BASE).sort()).toEqual([
      "xsypher/articles/a.png",
      "xsypher/articles/lazy.png",
      "xsypher/articles/original.png",
      "xsypher/articles/poster.jpg",
      "xsypher/articles/unquoted.png",
    ]);
  });

  it("splits srcset candidates and drops their width descriptors", () => {
    const html = `<img srcset="${url("xsypher/articles/s-640.png")} 640w, ${url(
      "xsypher/articles/s-1024.png",
    )} 1024w" src="${url("xsypher/articles/fallback.png")}">`;
    expect(extractKeysFromHtml(html, BASE).sort()).toEqual([
      "xsypher/articles/fallback.png",
      "xsypher/articles/s-1024.png",
      "xsypher/articles/s-640.png",
    ]);
  });

  it("finds CSS url() backgrounds in inline styles and style blocks", () => {
    const html = `
      <div style="background-image:url('${url("xsypher/articles/inline-bg.png")}')"></div>
      <style>.hero { background: url(${url("xsypher/articles/block-bg.png")}); }</style>
    `;
    expect(extractKeysFromHtml(html, BASE).sort()).toEqual([
      "xsypher/articles/block-bg.png",
      "xsypher/articles/inline-bg.png",
    ]);
  });

  it("decodes entity-escaped ampersands before resolving", () => {
    const html = `<img src="${BASE}/xsypher/articles/amp.png?fit=crop&amp;w=800">`;
    expect(extractKeysFromHtml(html, BASE)).toEqual(["xsypher/articles/amp.png"]);
  });

  it("returns nothing for markup with no owned asset, and dedupes repeats", () => {
    const html = `<img src="https://images.pexels.com/a.jpg"><img src="${url("xsypher/a.png")}"><img src="${url("xsypher/a.png")}">`;
    expect(extractKeysFromHtml(html, BASE)).toEqual(["xsypher/a.png"]);
    expect(extractKeysFromHtml(null, BASE)).toEqual([]);
    expect(extractKeysFromHtml("", BASE)).toEqual([]);
  });
});

describe("extractKeysFromJson", () => {
  it("walks a TipTap document and reads URL attributes at any depth", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "imageBlock",
          attrs: { src: url("xsypher/articles/json-src.png"), alt: "not a url" },
          content: [
            { type: "paragraph", content: [{ type: "image", attrs: { href: url("xsypher/articles/json-href.png") } }] },
          ],
        },
        { type: "embedBlock", attrs: { url: url("xsypher/articles/json-url.png"), poster: url("xsypher/articles/json-poster.jpg") } },
        { type: "unknownFutureBlock", attrs: { graphic: url("xsypher/articles/json-graphic.png") } },
      ],
    };
    expect(extractKeysFromJson(doc, BASE).sort()).toEqual([
      "xsypher/articles/json-graphic.png",
      "xsypher/articles/json-href.png",
      "xsypher/articles/json-poster.jpg",
      "xsypher/articles/json-src.png",
      "xsypher/articles/json-url.png",
    ]);
  });

  it("splits a srcset stored in JSON", () => {
    const doc = { attrs: { srcset: `${url("xsypher/a-640.png")} 640w, ${url("xsypher/a-1024.png")} 1024w` } };
    expect(extractKeysFromJson(doc, BASE).sort()).toEqual(["xsypher/a-1024.png", "xsypher/a-640.png"]);
  });

  it("ignores non-URL attributes and foreign hosts", () => {
    const doc = {
      attrs: {
        alt: "a photograph of a truck",
        caption: `${BASE}/xsypher/articles/in-a-caption.png`,
        src: "https://images.pexels.com/photos/1/x.jpg",
      },
    };
    expect(extractKeysFromJson(doc, BASE)).toEqual([]);
  });

  it("terminates on a self-referencing document", () => {
    const doc: Record<string, unknown> = { attrs: { src: url("xsypher/cycle.png") } };
    doc.self = doc;
    expect(extractKeysFromJson(doc, BASE)).toEqual(["xsypher/cycle.png"]);
  });
});

describe("collectArticleAssetKeys", () => {
  const article = {
    img: url("xsypher/articles/featured.png"),
    ogImage: url("xsypher/articles/social.png"),
    contentUrl: "articles/content-abc123.json",
  };

  it("collects the columns plus the inline media of both payload halves", () => {
    const payload = {
      html: `<p>body</p><img src="${url("xsypher/articles/body.png")}">`,
      json: { content: [{ attrs: { src: url("xsypher/articles/json-only.png") } }] },
    };
    expect(collectArticleAssetKeys(article, payload, BASE).sort()).toEqual([
      "articles/content-abc123.json",
      "xsypher/articles/body.png",
      "xsypher/articles/featured.png",
      "xsypher/articles/json-only.png",
      "xsypher/articles/social.png",
    ]);
  });

  it("treats a raw string payload as HTML", () => {
    expect(collectArticleAssetKeys({ contentUrl: "articles/c.json" }, `<img src="${url("xsypher/x.png")}">`, BASE).sort()).toEqual([
      "articles/c.json",
      "xsypher/x.png",
    ]);
  });

  it("still returns the content blob key when the payload could not be read", () => {
    // The body of a deleted story must not survive in the bucket just because
    // the fetch that would have enumerated its images failed.
    expect(collectArticleAssetKeys(article, null, BASE).sort()).toEqual([
      "articles/content-abc123.json",
      "xsypher/articles/featured.png",
      "xsypher/articles/social.png",
    ]);
  });

  it("drops references that are not in the bucket", () => {
    expect(
      collectArticleAssetKeys(
        { img: "https://images.pexels.com/photos/2/y.jpg", contentUrl: "/uploads/legacy.json" },
        { html: `<img src="https://cdn.other.test/a.png">` },
        BASE,
      ),
    ).toEqual([]);
  });
});

describe("buildDeleteObjectsXml", () => {
  it("escapes key text so a quoted or ampersanded filename cannot break the body", () => {
    const xml = buildDeleteObjectsXml([`xsypher/a&b.png`, `xsypher/"q".png`]);
    expect(xml).toContain("<Key>xsypher/a&amp;b.png</Key>");
    expect(xml).toContain("<Key>xsypher/&quot;q&quot;.png</Key>");
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
    expect(xml.trimEnd().endsWith("</Delete>")).toBe(true);
  });
});
