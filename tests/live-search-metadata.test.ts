import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import {
  buildLikePattern,
  buildPrefixTsQuery,
  describeMatchField,
  extractSearchTokens,
  highlightSegments,
  normalizeQuery,
  truncateExcerpt,
  MIN_LIVE_QUERY_LENGTH,
} from "@/lib/search-query";
import { isStaleAsset, rejectStaleAsset, STALE_ASSET_PATTERNS } from "@/lib/stale-assets";
import {
  ARTICLE_FALLBACK_COVER,
  BRAND_BANNER_PATH,
  IMAGE_WIDTHS,
  optimizeImageUrl,
  resolveImageSrc,
  supportsImageTransformations,
} from "@/lib/image-url";
import {
  absoluteImageUrl,
  articleCanonicalUrl,
  articleFeaturedCrawlerUrl,
  articleFeaturedImageUrl,
  brandBannerUrl,
  constructMetadata,
  generateNewsArticleJsonLd,
  siteConfig,
} from "@/lib/seo";
import {
  generateCollectionPageJsonLd,
  generateProfilePageJsonLd,
} from "@/lib/entity-schema";

/* ─────────────────────────────────────────────────────────────────────────────
 * Live search — query helpers
 * ───────────────────────────────────────────────────────────────────────────── */

describe("live search query helpers", () => {
  it("normalizes whitespace, strips control characters and caps length", () => {
    expect(normalizeQuery("  graph\u0000  neural   ")).toBe("graph neural");
    expect(normalizeQuery("a".repeat(200)).length).toBe(80);
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery("   ")).toBe("");
    expect(MIN_LIVE_QUERY_LENGTH).toBe(2);
  });

  it("extracts highlight tokens for partial words", () => {
    expect(extractSearchTokens("Graph")).toEqual(["graph"]);
    expect(extractSearchTokens("graph neural")).toEqual(["graph", "neural"]);
    // Duplicates collapse so highlighting does not double-count a word.
    expect(extractSearchTokens("graph graph")).toEqual(["graph"]);
    // Purely symbolic input yields nothing to search for.
    expect(extractSearchTokens("!!!")).toEqual([]);
  });

  it("escapes LIKE metacharacters so a wildcard cannot widen the query", () => {
    expect(buildLikePattern("100%_match")).toBe("%100\\%\\_match%");
  });

  it("builds a prefix-aware tsquery and refuses unusable input", () => {
    expect(buildPrefixTsQuery("graph")).toBe("graph:*");
    expect(buildPrefixTsQuery("graph neural")).toBe("graph:* & neural:*");
    // Single characters are dropped: they would match most of the archive.
    expect(buildPrefixTsQuery("a")).toBeNull();
    expect(buildPrefixTsQuery("!!!")).toBeNull();
    // Operators cannot survive tokenization, so user input is never syntax:
    // the parentheses and pipe are stripped and the words are ANDed as terms.
    expect(buildPrefixTsQuery("news & (graph|net)")).toBe("news:* & graph:* & net:*");
  });

  it("truncates excerpts on a word boundary", () => {
    expect(truncateExcerpt("short deck", 40)).toBe("short deck");
    const long = truncateExcerpt("one two three four five six seven eight nine ten", 20);
    expect(long.endsWith("…")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(21);
    expect(long).not.toContain("  ");
  });

  it("splits text into matched and unmatched segments, longest token first", () => {
    expect(highlightSegments("Graph theory", ["graph"])).toEqual([
      { text: "Graph", match: true },
      { text: " theory", match: false },
    ]);
    // "graph" wins over "gra" so the whole word is marked once.
    expect(highlightSegments("graph", ["gra", "graph"])).toEqual([{ text: "graph", match: true }]);
    expect(highlightSegments("nothing here", ["graph"])).toEqual([{ text: "nothing here", match: false }]);
    expect(highlightSegments("", ["graph"])).toEqual([]);
  });

  it("labels why a row matched", () => {
    expect(describeMatchField("title")).toBe("Title match");
    expect(describeMatchField("tag", ["AI", "ML", "Security"])).toBe("Tagged AI, ML");
    expect(describeMatchField("none")).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Stale asset guard + image resolution
 * ───────────────────────────────────────────────────────────────────────────── */

describe("stale asset guard", () => {
  it("recognises the placeholder that leaked into Google Images", () => {
    expect(isStaleAsset("https://media.xsypher.com/uploads/homenest-movers-truck.png")).toBe(true);
    expect(isStaleAsset("HOMENEST-Movers.PNG")).toBe(true);
    expect(isStaleAsset("https://cdn.example.com/logo-4-squares.png")).toBe(true);
    expect(isStaleAsset("https://media.xsypher.com/2026/01/a-real-featured-image.webp")).toBe(false);
    expect(isStaleAsset(null)).toBe(false);
    expect(isStaleAsset("")).toBe(false);
  });

  it("matches a URL-encoded key and a bare R2 object key", () => {
    expect(isStaleAsset("uploads/homenest%20movers.png")).toBe(true);
    expect(isStaleAsset("uploads/2026/03/hero.webp")).toBe(false);
  });

  it("keeps the pattern list specific enough to be safe", () => {
    // A pattern that is too generic silently deletes editorial imagery.
    for (const pattern of STALE_ASSET_PATTERNS) {
      expect(pattern.length).toBeGreaterThan(5);
    }
    expect(rejectStaleAsset("https://media.xsypher.com/story.png")).toBe("https://media.xsypher.com/story.png");
    expect(rejectStaleAsset("https://media.xsypher.com/homenest.png")).toBeNull();
  });
});

describe("image resolution", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE", "https://media.xsypher.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("routes R2 images through the Cloudflare transform at the requested width", () => {
    const url = resolveImageSrc("https://media.xsypher.com/2026/02/hero.webp", IMAGE_WIDTHS.card, 427);
    expect(url).toBe("https://media.xsypher.com/cdn-cgi/image/width=640,format=auto,quality=82/2026/02/hero.webp");
  });

  it("does not double-transform an already transformed URL", () => {
    const once = optimizeImageUrl("https://media.xsypher.com/hero.webp", 640);
    expect(optimizeImageUrl(once, 300)).toBe(once);
  });

  it("serves raw object URLs from an r2.dev base, which cannot transform", () => {
    // The public developer endpoint (`pub-….r2.dev`) is not a Cloudflare zone:
    // `/cdn-cgi/image/…` there is a key lookup that 404s. Production uses the
    // custom domain (above); a dev/preview deployment must still render.
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE", "https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev");
    expect(supportsImageTransformations("https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev")).toBe(false);
    expect(resolveImageSrc("https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev/2026/02/hero.webp", IMAGE_WIDTHS.articleHero, 788))
      .toBe("https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev/2026/02/hero.webp");
    // Already-transformed URLs are never touched either way.
    expect(optimizeImageUrl("https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev/hero.webp", 640))
      .toBe("https://pub-cb79a088effc4ad3a3636de153e20b63.r2.dev/hero.webp");
  });

  it("treats the S3 API endpoint and a custom domain as the two known cases", () => {
    expect(supportsImageTransformations("https://abc123.r2.cloudflarestorage.com")).toBe(false);
    expect(supportsImageTransformations("https://media.xsypher.com")).toBe(true);
    expect(supportsImageTransformations("not a url")).toBe(false);
  });

  it("leaves foreign hosts and relative assets alone", () => {
    expect(optimizeImageUrl("https://images.pexels.com/photos/1/a.jpeg", 640))
      .toBe("https://images.pexels.com/photos/1/a.jpeg");
    expect(resolveImageSrc("/tariq.webp", 320)).toBe("/tariq.webp");
  });

  it("still expands a bare legacy photo id, but only a numeric one", () => {
    // Pre-R2 rows hold a photo id, not a URL. It keeps rendering its own image
    // rather than turning into a blank card; the purge script lists it.
    expect(resolveImageSrc("17483873", 640, 427)).toContain("images.pexels.com/photos/17483873");
    // Any other non-URL string used to become `…/pexels-photo-NaN.jpeg`.
    expect(resolveImageSrc("gemini-image-1", 640)).toBe(ARTICLE_FALLBACK_COVER);
    expect(resolveImageSrc("0", 640)).toBe(ARTICLE_FALLBACK_COVER);
    expect(resolveImageSrc("-42", 640)).toBe(ARTICLE_FALLBACK_COVER);
  });

  it("falls back to the neutral cover for missing or stale values", () => {
    expect(resolveImageSrc(null, 640)).toBe(ARTICLE_FALLBACK_COVER);
    expect(resolveImageSrc("", 640)).toBe(ARTICLE_FALLBACK_COVER);
    expect(resolveImageSrc("https://media.xsypher.com/homenest-movers.png", 640)).toBe(ARTICLE_FALLBACK_COVER);
  });

  it("keeps archive thumbnails strictly smaller than the article hero", () => {
    expect(IMAGE_WIDTHS.card).toBeLessThan(IMAGE_WIDTHS.cardHero);
    expect(IMAGE_WIDTHS.cardHero).toBeLessThan(IMAGE_WIDTHS.articleHero);
    expect(IMAGE_WIDTHS.row).toBeLessThan(IMAGE_WIDTHS.card);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Article structured data & metadata
 * ───────────────────────────────────────────────────────────────────────────── */

const featuredResolved = () => "https://media.xsypher.com/cdn-cgi/image/width=1200,format=auto,quality=82/2026/02/hero.webp";

// Absolute URL without the CDN transform, used by absoluteImageUrl().
const featuredAbsolute = "https://media.xsypher.com/2026/02/hero.webp";

describe("article metadata", () => {
  // lib/image-url resolves the R2 public base at call time, so the crawler-form
  // URL only carries the Cloudflare transform when it is configured.
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE", "https://media.xsypher.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const article = {
    title: "Graph neural networks explained",
    slug: "graph-neural-networks",
    deck: "How message passing actually works.",
    img: featuredAbsolute,
    ogImage: "https://xsypher.com/api/og?title=Graph+neural+networks",
    featuredImageAlt: "A diagram of a graph neural network",
    featuredImageCaption: "Message passing between nodes",
    featuredImageCredit: "xSypher Graphics",
    createdAt: new Date("2026-02-01T00:00:00Z"),
    updatedAt: new Date("2026-02-02T00:00:00Z"),
    publishedAt: new Date("2026-02-01T09:00:00Z"),
    readingTime: 7,
    isAnonymous: false,
    author: "Anwar Iqbal Dawar",
    authorModel: { name: "Anwar Iqbal Dawar", slug: "anwar-iqbal-dawar", avatar: "/anwar.webp" },
    category: { name: "AI", slug: "ai" },
    tags: [{ tag: { name: "Machine Learning", slug: "machine-learning" } }],
  };

  it("uses the featured image — never ogImage — as the article's image", () => {
    const schema = generateNewsArticleJsonLd(article) as any;
    expect(schema.image).toHaveLength(1);
    expect(schema.image[0].url).toBe(featuredResolved());
    expect(schema.primaryImageOfPage.url).toBe(featuredResolved());
    expect(schema.thumbnailUrl).toBe(featuredResolved());
    expect(JSON.stringify(schema)).not.toContain("/api/og");
  });

  it("binds mainEntityOfPage to the canonical article URL", () => {
    const schema = generateNewsArticleJsonLd(article) as any;
    const canonical = `${siteConfig.url}/article/${article.slug}`;
    expect(schema.mainEntityOfPage["@id"]).toBe(canonical);
    expect(schema.url).toBe(canonical);
    expect(schema.headline).toBe(article.title);
    expect(schema.articleSection).toBe("AI");
    expect(schema.keywords).toBe("Machine Learning");
  });

  it("honours an editor-set canonical override", () => {
    expect(articleCanonicalUrl({ slug: "a", canonicalUrl: "/article/b" })).toBe(`${siteConfig.url}/article/b`);
    expect(articleCanonicalUrl({ slug: "a", canonicalUrl: "https://example.com/syndicated" }))
      .toBe("https://example.com/syndicated");
    expect(articleCanonicalUrl({ slug: "a", canonicalUrl: null })).toBe(`${siteConfig.url}/article/a`);
  });

  it("omits the image entirely rather than borrowing one", () => {
    const schema = generateNewsArticleJsonLd({ ...article, img: null }) as any;
    expect(schema.image).toBeUndefined();
    expect(schema.primaryImageOfPage).toBeUndefined();
    expect(articleFeaturedImageUrl({ img: null })).toBeUndefined();
  });

  it("refuses a stale placeholder as the featured image", () => {
    expect(articleFeaturedImageUrl({ img: "https://media.xsypher.com/homenest-movers.png" })).toBeUndefined();
    const schema = generateNewsArticleJsonLd({ ...article, img: "https://media.xsypher.com/homenest-movers.png" }) as any;
    expect(schema.image).toBeUndefined();
  });

  it("keeps og/twitter on the featured image with the headline as alt text", () => {
    const metadata: any = constructMetadata({
      title: article.title,
      image: articleFeaturedImageUrl(article),
      imageAlt: article.featuredImageAlt,
      canonical: `/article/${article.slug}`,
      type: "article",
    });
    expect(metadata.openGraph.images[0].url).toBe(featuredAbsolute);
    expect(metadata.openGraph.images[0].alt).toBe(article.featuredImageAlt);
    expect(metadata.twitter.images[0]).toBe(featuredAbsolute);
    expect(metadata.alternates.canonical).toBe(`${siteConfig.url}/article/${article.slug}`);
  });

  it("keeps index/follow independent so an archive can be noindex, follow", () => {
    const category: any = constructMetadata({ title: "AI", index: false, follow: true });
    expect(category.robots.index).toBe(false);
    expect(category.robots.follow).toBe(true);
    // The legacy switch still means "index nothing, follow nothing".
    const legacy: any = constructMetadata({ title: "Private", noIndex: true });
    expect(legacy.robots.index).toBe(false);
    expect(legacy.robots.follow).toBe(false);
    expect(category.robots.googleBot["max-image-preview"]).toBe("large");
  });

  it("resolves the brand banner absolutely and rejects stale values", () => {
    expect(brandBannerUrl()).toBe(`${siteConfig.url}${BRAND_BANNER_PATH}`);
    expect(absoluteImageUrl("https://media.xsypher.com/homenest-movers.png")).toBeUndefined();
    expect(absoluteImageUrl("/fallback-cover.webp")).toBe(`${siteConfig.url}/fallback-cover.webp`);
  });

  it("never resolves a bare legacy id into a URL that 404s", () => {
    // `https://xsypher.com/17483873` is what a blank check produces for a
    // pre-R2 photo id. Metadata omits the tag instead — the same answer as for
    // an article with no featured image at all.
    expect(absoluteImageUrl("17483873")).toBeUndefined();
    expect(absoluteImageUrl("gemini-image-1")).toBeUndefined();
    expect(articleFeaturedImageUrl({ img: "17483873" })).toBeUndefined();
    expect(articleFeaturedCrawlerUrl({ img: "17483873" })).toBeUndefined();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Archive structured data
 * ───────────────────────────────────────────────────────────────────────────── */

describe("archive structured data", () => {
  it("gives an author profile the avatar as its only primary image", () => {
    const schema = generateProfilePageJsonLd(
      { name: "Tariq Jameel", slug: "tariq-jameel", avatar: "/tariq.webp", role: "Reporter" },
      [{ slug: "story-one", title: "Story one" }],
    ) as any;

    expect(schema["@type"]).toBe("ProfilePage");
    expect(schema.image).toHaveLength(1);
    expect(schema.image[0].url).toBe(`${siteConfig.url}/tariq.webp`);
    expect(schema.primaryImageOfPage.url).toBe(`${siteConfig.url}/tariq.webp`);
    // The article list is URLs only: no thumbnail can be read as the profile's.
    expect(schema.hasPart.itemListElement[0].url).toBe(`${siteConfig.url}/article/story-one`);
    expect(schema.hasPart.itemListElement[0].image).toBeUndefined();
    expect(JSON.stringify(schema)).not.toContain("/article/story-one\"".replace("\"", "") + "image");
  });

  it("omits the image for an author with no avatar instead of substituting cards", () => {
    const schema = generateProfilePageJsonLd({ name: "No Photo", slug: "no-photo" }) as any;
    expect(schema.image).toBeUndefined();
    expect(schema.primaryImageOfPage).toBeUndefined();
  });

  it("gives a collection page the brand banner and no article images", () => {
    const schema = generateCollectionPageJsonLd({
      url: `${siteConfig.url}/category/ai`,
      name: "AI — xSypher",
      items: [{ url: `${siteConfig.url}/article/graph-neural-networks`, name: "Graph neural networks" }],
    }) as any;

    expect(schema["@type"]).toBe("CollectionPage");
    expect(schema.image).toHaveLength(1);
    expect(schema.image[0].url).toBe(brandBannerUrl());
    expect(schema.primaryImageOfPage.url).toBe(brandBannerUrl());
    expect(schema.mainEntity.itemListElement).toHaveLength(1);
    expect(schema.mainEntity.itemListElement[0].image).toBeUndefined();
    // No article URL is ever presented as an image of the archive.
    expect(JSON.stringify(schema.image)).not.toContain("/article/");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Live search SQL — or rather, the absence of it
 *
 * This block used to guard a raw statement whose clauses each spelled the table
 * out (`"Article"."title"`) while the FROM clause aliased it, which Postgres
 * rejects with 42P01 — a 500 on every keystroke. The statement is gone: live
 * search now ranks a cached snapshot in memory, so the same class of bug cannot
 * exist. What still needs guarding is that nobody reintroduces per-query SQL,
 * and that the one statement that does exist (the snapshot builder) is built
 * with the query builder, which qualifies columns for us.
 * ───────────────────────────────────────────────────────────────────────────── */

describe("live search SQL", () => {
  // Prose in these files quotes SQL on purpose; only statements count.
  const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("issues no statement at all from the live-search path", () => {
    for (const file of ["lib/search.ts", "app/api/search/route.ts"]) {
      const source = stripComments(readFileSync(path.join(process.cwd(), file), "utf8"));
      expect(source, file).not.toContain("@/lib/db");
      expect(source, file).not.toMatch(/to_tsvector|ts_rank|plainto_/);
      expect(source, file).not.toMatch(/db\.(execute|select|query|insert|update|delete)\b/);
    }
  });

  it("builds the snapshot with qualified columns from the query builder", () => {
    const source = stripComments(readFileSync(path.join(process.cwd(), "lib/cached-queries.ts"), "utf8"));
    // The snapshot is one builder query (plus an optional count), not a
    // hand-written statement that could mis-qualify a column.
    expect(source).toContain("querySearchIndexRows");
    expect(source).not.toContain("to_tsvector");
  });
});
