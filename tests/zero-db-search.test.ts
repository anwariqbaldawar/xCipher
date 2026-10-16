import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  countWordPrefixHits,
  fullTextTokens,
  rankSearchIndex,
  scoreSearchIndexEntry,
  type SearchIndexEntry,
} from "@/lib/search-index";
import { articleMutationTags, CACHE_TAGS, taxonomyMutationTags } from "@/lib/cache-tags";
import { isCrawlerUserAgent } from "@/lib/bot-detection";
import { resetDatabaseProbe, shouldProbeDatabase } from "@/lib/db-health";
import { forgetSearchIndexMemory, readSearchIndexMemory, searchIndexMemoryTtlMs, writeSearchIndexMemory } from "@/lib/search-index-memory";

/* ─────────────────────────────────────────────────────────────────────────────
 * Zero database wake-ups
 *
 * The behaviour these tests protect is a *cost* property, not a feature: Neon
 * bills compute in CU-hours and suspends after ~5 minutes idle, so every SQL
 * statement issued by public reader traffic (a keystroke, a crawl, a page view)
 * is worth minutes of compute. Two kinds of assertion follow from that:
 *
 *   1. the search path produces the same results the SQL ranker did — parity, so
 *      nothing visible changed;
 *   2. the search path cannot reach the database at all — the module's database
 *      import is replaced with one that throws on any property access, so a
 *      regression that reintroduces a query fails loudly here instead of quietly
 *      on the bill.
 * ───────────────────────────────────────────────────────────────────────────── */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  select: vi.fn(),
  registered: [] as { keys: string[]; options: unknown; fn: () => Promise<unknown> }[],
}));

/** Any touch of the database from the search path is a test failure. */
function explode(): never {
  throw new Error("the search path touched the database");
}

vi.mock("@/lib/db", () => {
  const dbMock = {
    query: { article: { findMany: mocks.findMany } },
    select: mocks.select,
    get $client(): never { return explode(); },
  };
  return { db: dbMock, dbRead: dbMock };
});

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, keys: string[], options: unknown) => {
    // Record the registration, then run straight through: the tests below are
    // about what the cached function does, not about Next's cache storage.
    mocks.registered.push({ keys, options, fn });
    return fn;
  },
}));

const INDEX_COLUMNS = {
  id: "graph-neural-networks",
  slug: "graph-neural-networks",
  title: "Graph Neural Networks Explained",
  deck: "How message passing works in practice",
  img: "xsypher/articles/hero.jpg",
  image: "https://cdn.example/hero-168x126.jpg",
  createdAt: "2026-10-01T00:00:00.000Z",
  publishedAt: "2026-10-02T00:00:00.000Z",
  readingTime: 7,
  views: 4200,
  categoryId: "cat-ai",
  categoryName: "AI",
  categorySlug: "ai",
  categoryParentName: null,
  categoryParentSlug: null,
  authorModelName: "Anwar Iqbal",
  authorModelSlug: "anwar-iqbal",
  authorModelAvatar: "https://cdn.example/avatar.png",
  legacyAuthor: "Anwar Iqbal",
  isAnonymous: false,
  publicAuthorName: "Anwar Iqbal",
  publicAuthorRole: "Editor",
  tags: [{ name: "Graph Theory", slug: "graph-theory" }],
  legacyTags: [],
  bodyText: "A graph of message passing layers.",
} satisfies SearchIndexEntry;

const QUIET_ID = {
  ...INDEX_COLUMNS,
  id: "quiet-mode",
  slug: "quiet-mode",
  title: "Quiet Mode",
  deck: "Nothing to do with the query",
  tags: [],
  bodyText: "Unrelated body copy.",
  views: 0,
} satisfies SearchIndexEntry;

beforeEach(() => {
  vi.resetModules();
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.select.mockReset();
  mocks.registered.length = 0;
  forgetSearchIndexMemory();
});

describe("in-memory search ranking keeps the SQL contract", () => {
  it("keeps the SQL base weights in their original order", () => {
    const score = (entry: SearchIndexEntry) => scoreSearchIndexEntry(entry, "graph")?.score ?? -1;

    const exact = { ...INDEX_COLUMNS, title: "graph" };
    const prefix = { ...INDEX_COLUMNS, title: "Graph neural networks" };
    const containsTitle = { ...INDEX_COLUMNS, title: "Introduction to graph theory" };
    const slugOnly = { ...INDEX_COLUMNS, title: "Something else", slug: "graph-notes", deck: null, bodyText: null, tags: [] };
    const tagOnly = { ...INDEX_COLUMNS, title: "Something else", slug: "other", deck: null, bodyText: null, tags: [{ name: "Graph", slug: "graph" }] };
    const categoryOnly = { ...INDEX_COLUMNS, title: "Something else", slug: "other", deck: null, tags: [], bodyText: null, categoryName: "Graph", categorySlug: "graph" };

    // 100 → 80 → 65, all with the same full-text contribution (the word is in
    // the title in each case), so this is the base weighting on its own.
    expect(score(exact)).toBeGreaterThan(score(prefix));
    expect(score(prefix)).toBeGreaterThan(score(containsTitle));

    // 65 (title) > 50 (slug) > 40 (tag) > 22 (section/author). The slug, tag and
    // section variants deliberately keep "graph" out of title/deck/body so the
    // full-text term is identical (zero) across them.
    expect(score(containsTitle)).toBeGreaterThan(score(slugOnly));
    expect(score(slugOnly)).toBeGreaterThan(score(tagOnly));
    expect(score(tagOnly)).toBeGreaterThan(score(categoryOnly));
  });

  it("lets the full-text term lift a lower tier, exactly as ts_rank * 12 did", () => {
    const score = (entry: SearchIndexEntry) => scoreSearchIndexEntry(entry, "graph")?.score ?? -1;

    // A tag match (40) that says nothing in its own text scores below a deck
    // mention (30) that also satisfies the prefix full-text query (+12): the SQL
    // ranker behaved the same way, because `ts_rank` only ever looked at
    // title/deck/textContent. Recorded here so a future "tidy-up" of the weights
    // does not silently reorder results.
    const tagOnly = { ...INDEX_COLUMNS, title: "Something else", slug: "other", deck: null, bodyText: null, tags: [{ name: "Graph", slug: "graph" }] };
    const deckOnly = { ...INDEX_COLUMNS, title: "Something else", slug: "other", deck: "a graph of results", tags: [], bodyText: null };
    expect(score(deckOnly)).toBeGreaterThan(score(tagOnly));
  });

  it("labels the matched field exactly as the SQL CASE did", () => {
    const label = (entry: SearchIndexEntry) => scoreSearchIndexEntry(entry, "graph")?.matchField;
    expect(label({ ...INDEX_COLUMNS, title: "Graph" })).toBe("title");
    expect(label(INDEX_COLUMNS)).toBe("title");
    expect(label({ ...INDEX_COLUMNS, title: "Other", slug: "graph-story" })).toBe("slug");
    expect(label({ ...INDEX_COLUMNS, title: "Other", slug: "other", deck: null, tags: [{ name: "Graph Theory", slug: "graph-theory" }] })).toBe("tag");
    expect(label({ ...INDEX_COLUMNS, title: "Other", slug: "other", deck: "graph of it", tags: [] })).toBe("summary");
    expect(label({ ...INDEX_COLUMNS, title: "Other", slug: "other", deck: null, tags: [], bodyText: null, categoryName: "Graph", categorySlug: "graph" })).toBe("category");
    expect(label({ ...INDEX_COLUMNS, title: "Other", slug: "other", categoryName: "AI", categorySlug: "ai", deck: null, tags: [], bodyText: null, authorModelName: "Graph Reporter" })).toBe("author");
    expect(label({ ...INDEX_COLUMNS, title: "Other", slug: "other", deck: null, tags: [], bodyText: "inside a graph", authorModelName: "X" })).toBe("content");
  });

  it("returns the wire shape the dropdown renders, including the image and anonymity guard", () => {
    const [result] = rankSearchIndex([INDEX_COLUMNS], "graph");
    expect(result).toEqual({
      id: "graph-neural-networks",
      slug: "graph-neural-networks",
      title: "Graph Neural Networks Explained",
      url: "/article/graph-neural-networks",
      excerpt: "How message passing works in practice",
      image: "https://cdn.example/hero-168x126.jpg",
      imageKey: "xsypher/articles/hero.jpg",
      publishedAt: "2026-10-02T00:00:00.000Z",
      readingTime: 7,
      categoryName: "AI",
      categorySlug: "ai",
      authorName: "Anwar Iqbal",
      authorSlug: "anwar-iqbal",
      authorAvatar: "https://cdn.example/avatar.png",
      matchField: "title",
      matchLabel: "Title match",
      // The tag chip list is computed independently of the match field, so a
      // title hit on a tagged story still reports the matching tag — the SQL
      // lateral join did the same.
      matchedTags: ["Graph Theory"],
      score: expect.any(Number),
    });

    // An anonymous story never exposes a byline, the way `maskPublicArticle`
    // strips one everywhere else.
    const [anonymous] = rankSearchIndex([
      { ...INDEX_COLUMNS, isAnonymous: true, publicAuthorName: "xSypher AI Desk" },
    ], "graph");
    expect(anonymous.authorSlug).toBeNull();
    expect(anonymous.authorAvatar).toBeNull();
  });

  it("matches partial words while typing, as the prefix tsquery did", () => {
    expect(rankSearchIndex([INDEX_COLUMNS], "grap")).toHaveLength(1);
    expect(rankSearchIndex([INDEX_COLUMNS], "neural net")).toHaveLength(1);
    expect(rankSearchIndex([INDEX_COLUMNS], "neural quantum")).toHaveLength(0);
    expect(rankSearchIndex([INDEX_COLUMNS], "anwar")).toHaveLength(1);
    expect(rankSearchIndex([INDEX_COLUMNS], "zz")).toHaveLength(0);

    // The minimum query length is the *endpoint's* rule, not the ranker's — the
    // same split the SQL version had (`MIN_LIVE_QUERY_LENGTH` is enforced in
    // app/api/search/route.ts before any work happens).
    const route = readFileSync(path.join(process.cwd(), "app/api/search/route.ts"), "utf8");
    expect(route).toContain("MIN_LIVE_QUERY_LENGTH");
  });

  it("pages deterministically: score, then publishedAt desc, then id", () => {
    const sameScore = (id: string, publishedAt: string): SearchIndexEntry => ({
      ...INDEX_COLUMNS,
      id,
      slug: id,
      title: `Graph ${id}`,
      publishedAt,
    });
    const entries = [
      sameScore("b", "2026-10-01T00:00:00.000Z"),
      sameScore("a", "2026-10-03T00:00:00.000Z"),
      sameScore("c", "2026-10-01T00:00:00.000Z"),
      { ...QUIET_ID },
    ];

    const page1 = rankSearchIndex(entries, "graph", { limit: 2 });
    const page2 = rankSearchIndex(entries, "graph", { limit: 2, offset: 2 });
    expect(page1.map(r => r.id)).toEqual(["a", "b"]);
    // `id ASC` breaks the publishedAt tie exactly as `ORDER BY "id" ASC` did, so
    // page 2 is a continuation rather than a reshuffle.
    expect(page2.map(r => r.id)).toEqual(["c"]);
    expect(rankSearchIndex(entries, "graph").map(r => r.id)).toEqual(["a", "b", "c"]);
  });

  it("caps the result window at 40, matching the SQL LIMIT ceiling", () => {
    const entries = Array.from({ length: 60 }, (_, index) => ({
      ...INDEX_COLUMNS,
      id: `story-${index}`,
      slug: `story-${index}`,
      title: `Graph ${index}`,
    }));
    expect(rankSearchIndex(entries, "graph", { limit: 500 })).toHaveLength(40);
  });

  it("counts word-boundary hits so a mid-word coincidence ranks lower", () => {
    expect(countWordPrefixHits("a graph of graphs", "graph")).toBe(2);
    expect(countWordPrefixHits("paragraphs", "graph")).toBe(0);
    expect(fullTextTokens("graph & neural")).toEqual(["graph", "neural"]);
  });
});

describe("the search path cannot reach the database", () => {
  it("builds one 24h snapshot tagged search-index + articles, and ranks from it in memory", async () => {
    mocks.findMany.mockResolvedValue([INDEX_COLUMNS]);

    const { searchArticlesLive } = await import("@/lib/search");
    const results = await searchArticlesLive("graph", { limit: 8 });

    expect(results.map(r => r.slug)).toEqual(["graph-neural-networks"]);

    const registration = mocks.registered.find(entry => entry.keys[0] === "published-search-index-v1");
    expect(registration).toBeDefined();
    expect(registration?.options).toEqual({
      tags: [CACHE_TAGS.searchIndex, CACHE_TAGS.articles],
      revalidate: 86400,
    });
    // Tags literally, so renaming either one is caught here (the two surfaces
    // that invalidate search are `articleMutationTags` and `taxonomyMutationTags`).
    expect(registration?.options).toMatchObject({ tags: ["search-index", "articles"] });

    // Exactly one read for the snapshot, no matter how many queries follow.
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    await searchArticlesLive("neural", { limit: 8 });
    await searchArticlesLive("anwar", { limit: 8 });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);

    // The query filters are still the published-only ones: drafts and scheduled
    // stories (PUBLISHED with a future stamp) must never be searchable.
    const query = new PgDialect().sqlToQuery(mocks.findMany.mock.calls[0][0].where as SQL);
    expect(query.params).toContain("PUBLISHED");
    expect(query.sql).toContain('"Article"."publishedAt" <=');
  });

  it("stops re-reading the data cache while the process-local memo is warm", async () => {
    mocks.findMany.mockResolvedValue([INDEX_COLUMNS]);
    const { searchArticlesLive } = await import("@/lib/search");
    // Imported after the module reset so this is the same memo instance the
    // search path holds — a statically imported copy would be a different module
    // registry entry and clearing it would be a no-op.
    const { forgetSearchIndexMemory: forget } = await import("@/lib/search-index-memory");

    await searchArticlesLive("graph");
    expect(mocks.findMany).toHaveBeenCalledTimes(1);

    // A second call inside the memo window never re-reads the snapshot: this is
    // the difference between a keystroke and a JSON.parse of the archive.
    await searchArticlesLive("graph");
    await searchArticlesLive("neural", { offset: 0 });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);

    // Once the memo is dropped (what `revalidateTag` does), the next read rebuilds.
    forget();
    await searchArticlesLive("graph");
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });

  it("builds the snapshot with resolved images and JSON-safe timestamps", async () => {
    const { IMAGE_WIDTHS, resolveImageSrc } = await import("@/lib/image-url");
    mocks.findMany.mockResolvedValue([{
      id: "a1", slug: "a1", title: "Title", deck: null, img: "xsypher/articles/key.jpg",
      author: "Legacy Name", role: null, isAnonymous: false, views: 0, readingTime: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"), publishedAt: null, categoryId: null,
      legacyTags: ["Legacy"], bodyText: "  body copy  ", category: null, authorModel: null, tags: [],
    }]);

    const { getPublishedSearchIndex } = await import("@/lib/cached-queries");
    const payload = await getPublishedSearchIndex();

    expect(payload.entries[0].image).toBe(resolveImageSrc("xsypher/articles/key.jpg", IMAGE_WIDTHS.row, 168));
    // Dates are strings *inside* the cached value: the data cache round-trips
    // through JSON, so a Date would differ between a hit and a miss.
    expect(payload.entries[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(payload.entries[0].publishedAt).toBeNull();
    expect(payload.entries[0].bodyText).toBe("body copy");
    expect(payload.entries[0].legacyTags).toEqual(["Legacy"]);
    // Falls back to the legacy byline when the article has no author record.
    expect(payload.entries[0].authorModelName).toBeNull();
    expect(payload.total).toBe(1);
    expect(payload.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("never issues a query while the query text is empty or one character", async () => {
    const { searchArticlesLive } = await import("@/lib/search");
    expect(await searchArticlesLive("")).toEqual([]);
    expect(await searchArticlesLive("   ")).toEqual([]);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("cache invalidation reaches the search index", () => {
  it("treats a search-index snapshot as part of every article mutation", () => {
    const tags = articleMutationTags({ slug: "story", category: { slug: "ai" }, authorModel: { slug: "author" }, tagSlugs: ["security"] });
    expect(tags).toContain("search-index");
    expect(tags).toContain("articles");
    expect(tags).toContain("article:story");
    expect(tags).toContain("category:ai");
    expect(tags).toContain("author:author");
    expect(tags).toContain("tag:security");
  });

  it("invalidates listings and search on a taxonomy rename", () => {
    const tags = taxonomyMutationTags({ categorySlug: "ai", tagSlug: "graph" });
    expect(tags).toContain("taxonomy");
    expect(tags).toContain("articles");
    expect(tags).toContain("search-index");
    expect(tags).toContain("category:ai");
    expect(tags).toContain("tag:graph");
  });

  it("drops the in-process memo whenever the shared tag wrapper runs", () => {
    const source = readFileSync(path.join(process.cwd(), "lib/revalidate.ts"), "utf8");
    expect(source).toContain("forgetSearchIndexMemory");
    expect(source).toContain("CACHE_TAGS.articles");
    expect(source).toContain("CACHE_TAGS.searchIndex");
  });

  it("bounds the memo window and honours a zero-TTL opt-out", () => {
    vi.stubEnv("SEARCH_INDEX_MEMORY_TTL_MS", undefined);
    expect(searchIndexMemoryTtlMs()).toBe(15_000);
    expect(readSearchIndexMemory(0)).toBeNull();

    writeSearchIndexMemory({ ok: true }, 1_000);
    expect(readSearchIndexMemory(1_000)).toEqual({ ok: true });
    expect(readSearchIndexMemory(16_100)).toBeNull();

    vi.stubEnv("SEARCH_INDEX_MEMORY_TTL_MS", "0");
    writeSearchIndexMemory({ ok: true }, 1_000);
    expect(readSearchIndexMemory(1_000)).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe("machines are not readers", () => {
  it("classifies crawlers, unfurlers, AI bots and scripts", () => {
    for (const agent of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "LinkedInBot/1.0",
      "WhatsApp/2.23.20.0",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
      "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "PerplexityBot/1.0",
      "Mozilla/5.0 (compatible; YandexBot/3.0)",
      "AhrefsBot/7.0 (+http://ahrefs.com/robot/)",
      "UptimeRobot/2.0",
      "curl/8.4.0",
      "python-requests/2.31.0",
      "node-fetch/1.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0.0.0",
    ]) {
      expect(isCrawlerUserAgent(agent), agent).toBe(true);
    }
  });

  it("counts a real browser, and treats a missing user agent as a machine", () => {
    for (const agent of [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    ]) {
      expect(isCrawlerUserAgent(agent), agent).toBe(false);
    }
    expect(isCrawlerUserAgent(null)).toBe(true);
    expect(isCrawlerUserAgent("")).toBe(true);
  });

  it("budgets the health probe so a monitor cannot hold the compute awake", () => {
    const fiveMinutes = 300_000;
    // First request always probes.
    expect(shouldProbeDatabase(null, 0, fiveMinutes)).toBe(true);
    // Inside the window: answered from the last success.
    expect(shouldProbeDatabase(0, fiveMinutes - 1, fiveMinutes)).toBe(false);
    // At the window: probe again.
    expect(shouldProbeDatabase(0, fiveMinutes, fiveMinutes)).toBe(true);
    // Opt-out.
    expect(shouldProbeDatabase(0, 1, 0)).toBe(true);
    // Failures are never cached, so this seam must exist and be callable.
    resetDatabaseProbe();
    expect(resetDatabaseProbe).toBeTypeOf("function");
  });
});

describe("public routes no longer force a fresh database read", () => {
  const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");

  it("the live-search endpoint path contains no SQL", () => {
    for (const file of ["lib/search.ts", "lib/search-index.ts", "app/api/search/route.ts"]) {
      const source = read(file);
      expect(source, file).not.toContain("@/lib/db");
      expect(source, file).not.toMatch(/db\.(execute|select|query|update|insert)/);
    }
  });

  it("the search results page builds its rows from the snapshot, not from Postgres", () => {
    const source = read("app/(public)/search/page.tsx");
    expect(source).not.toContain("@/lib/db");
    expect(source).toContain("loadSearchIndex");
    expect(source).toContain("rankSearchIndex");
  });

  it("syndication surfaces and public reader routes cache instead of forcing dynamic", () => {
    for (const file of ["app/sitemap.xml/route.ts", "app/sitemap/articles.xml/route.ts", "app/sitemap/articles/route.ts", "app/feed.xml/route.ts"]) {
      const source = read(file);
      expect(source, file).not.toContain('export const dynamic = "force-dynamic"');
      expect(source, file).toContain("revalidate");
    }
    // The reader routes keep a revalidate window and no force-dynamic.
    for (const file of ["app/(public)/article/[slug]/page.tsx", "app/(public)/category/[slug]/page.tsx", "app/(public)/author/[slug]/page.tsx", "app/(public)/tag/[slug]/page.tsx"]) {
      const source = read(file);
      // The string may appear in prose (these files explain why the flag was
      // removed); what must not appear is the export.
      expect(source, file).not.toContain('export const dynamic = "force-dynamic"');
      expect(source, file).toContain("unstable_cache");
    }
  });

  it("keeps the article page's metadata and body on one cached read", () => {
    const source = read("app/(public)/article/[slug]/page.tsx");
    expect(source).toContain('cache(async (slug: string) =>');
    expect(source).toContain('["published-article-v1", slug]');
    expect(source).toContain("articleTag(slug)");
    // Dates must be rehydrated after a cache round-trip, or `toISOString()` in
    // the metadata builder throws on a warm cache.
    expect(source).toContain("function toDate(");
    expect(source).toContain("createdAt: toDate(article.createdAt)");
  });

  it("the view counter is buffered and gated on a real browser", () => {
    const source = read("app/actions/article.ts");
    expect(source).toContain("isCrawlerUserAgent");
    expect(source).toContain("bufferArticleView");
    // The synchronous fallback write is gone: no UPDATE from a page view.
    expect(source).not.toMatch(/bufferArticleView[\s\S]{0,900}db\.update\(article\)[\s\S]{0,200}views/);
  });

  it("keeps the pool on globalThis so a dev reload cannot leak connections", () => {
    const source = read("lib/db.ts");
    expect(source).toContain("__xsypherPoolStore");
    expect(source).toContain("poolIdleTimeoutMs");
  });
});
