// ─────────────────────────────────────────────────────────────────────────────
// Deletion: which paths get revalidated, and how assets are actually removed
// ─────────────────────────────────────────────────────────────────────────────
//
// Two things here are worth pinning down:
//
//   1. the set of public paths a delete invalidates. A missing entry is
//      invisible — the story simply keeps appearing on that page until its own
//      revalidate window expires, and a crawler finds it again.
//   2. that `purgeArticleAssets` really asks R2 to delete every key it found,
//      and that it reports failures instead of throwing, so a storage problem
//      cannot leave the row in place.
//
// The network is mocked, so this is a test of the pipeline's decisions, not of
// R2 itself.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as { url: string; method: string; body?: string }[],
  responder: () => new Response(null, { status: 204 }),
}));

vi.mock("aws4fetch", () => ({
  AwsClient: class {
    async fetch(input: string | URL | { url?: string }, init?: RequestInit) {
      const url = typeof input === "string" ? input : String((input as URL).toString?.() ?? input);
      const method = init?.method ?? "GET";
      state.calls.push({ url, method, body: typeof init?.body === "string" ? init.body : undefined });
      return state.responder();
    }
  },
}));

import {
  SYNDICATION_PATHS,
  deletionPaths,
  purgeArticleAssets,
  purgeEdgeCache,
} from "@/lib/article-deletion";

const BASE = "https://media.xsypher.com";
const article = {
  id: "art_1",
  slug: "graph-neural-networks",
  title: "Graph neural networks explained",
  img: `${BASE}/xsypher/articles/2026/10/featured.png`,
  ogImage: `${BASE}/xsypher/articles/2026/10/social.png`,
  contentUrl: "articles/content-art_1.json",
  publishedAt: new Date("2026-10-01T09:00:00.000Z"),
  category: { slug: "ai" },
  authorModel: { slug: "anwar-iqbal-dawar" },
  tagSlugs: ["machine-learning", "graphs"],
};

beforeEach(() => {
  state.calls = [];
  state.responder = () => new Response(null, { status: 204 });
  vi.stubEnv("R2_ACCOUNT_ID", "acct");
  vi.stubEnv("R2_ACCESS_KEY_ID", "key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
  vi.stubEnv("R2_BUCKET", "xsypher-media");
  vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE", BASE);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deletionPaths", () => {
  it("covers every public surface that can still be showing the story", () => {
    const paths = deletionPaths(article);
    for (const expected of [
      "/",
      "/latest",
      "/search",
      "/article/graph-neural-networks",
      "/category/ai",
      "/author/anwar-iqbal-dawar",
      "/tag/machine-learning",
      "/tag/graphs",
      "/feed.xml",
      "/rss.xml",
      "/sitemap.xml",
      "/sitemap/pages.xml",
      "/sitemap/articles.xml",
    ]) {
      expect(paths, expected).toContain(expected);
    }
  });

  it("includes every syndication surface, including any added later", () => {
    // SYNDICATION_PATHS is also what the publish/unpublish path invalidates, so
    // an entry added there must reach deletions too. Asserting the list rather
    // than the literals above is what keeps the two from drifting.
    const paths = deletionPaths(article);
    for (const path of SYNDICATION_PATHS) expect(paths).toContain(path);
    expect(SYNDICATION_PATHS).toContain("/feed.xml");
    expect(SYNDICATION_PATHS).toContain("/sitemap/pages.xml");
  });

  it("omits the archives an article does not have, and never repeats a path", () => {
    const bare = deletionPaths({ slug: "solo" });
    expect(bare).not.toContain("/category/undefined");
    expect(bare).not.toContain("/author/undefined");
    expect(bare.filter((path) => path === "/").length).toBe(1);

    const withTags = deletionPaths(article);
    expect(new Set(withTags).size).toBe(withTags.length);
  });
});

describe("purgeEdgeCache", () => {
  it("returns the URLs it was asked to evict and survives having no cache API", async () => {
    const urls = [`${BASE}/xsypher/articles/a.png`];
    await expect(purgeEdgeCache(urls)).resolves.toEqual(urls);
  });

  it("deletes each URL through the Cache API when the runtime provides it", async () => {
    const deleted: string[] = [];
    vi.stubGlobal("caches", {
      default: {
        delete: (url: string) => {
          deleted.push(url);
          return Promise.resolve(true);
        },
      },
    });

    await purgeEdgeCache([`${BASE}/xsypher/articles/a.png`, `${BASE}/xsypher/articles/b.png`]);
    expect(deleted).toEqual([`${BASE}/xsypher/articles/a.png`, `${BASE}/xsypher/articles/b.png`]);
  });

  it("uses the Cloudflare purge API in batches of 30 when a token is configured", async () => {
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone123");
    vi.stubEnv("CLOUDFLARE_PURGE_API_TOKEN", "token123");

    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    const urls = Array.from({ length: 31 }, (_, i) => `${BASE}/xsypher/articles/${i}.png`);
    await purgeEdgeCache(urls);

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain("/zones/zone123/purge_cache");
    expect((calls[0].body as { files: string[] }).files).toHaveLength(30);
    expect((calls[1].body as { files: string[] }).files).toHaveLength(1);
  });

  it("stays silent when no purge credentials are configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await purgeEdgeCache([`${BASE}/xsypher/articles/a.png`]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("purgeArticleAssets", () => {
  const payload = {
    html: `<p>body</p><img src="${BASE}/xsypher/articles/2026/10/inline.png">`,
    json: { content: [{ attrs: { src: `${BASE}/xsypher/articles/2026/10/from-json.png` } }] },
  };

  /** The content blob is read over the public base, so plain fetch serves it. */
  function stubContent(body: unknown) {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  }

  it("asks R2 to delete the body, the featured image, the social image and every inline asset", async () => {
    stubContent(payload);
    state.responder = () => new Response("", { status: 200 });

    const report = await purgeArticleAssets(article);
    const deleteCall = state.calls.find((call) => call.method === "POST" && call.url.includes("delete"));

    expect(deleteCall).toBeDefined();
    const body = deleteCall!.body ?? "";
    for (const key of [
      "articles/content-art_1.json",
      "xsypher/articles/2026/10/featured.png",
      "xsypher/articles/2026/10/social.png",
      "xsypher/articles/2026/10/inline.png",
      "xsypher/articles/2026/10/from-json.png",
    ]) {
      expect(body, key).toContain(`<Key>${key}</Key>`);
    }
    expect(report.keys).toHaveLength(5);
    expect(report.failed).toEqual([]);
  });

  it("keeps going, and reports, when R2 refuses the batch", async () => {
    stubContent(payload);
    // The batch call fails and then the one-by-one fallback fails too.
    state.responder = () => new Response("<Error><Code>AccessDenied</Code></Error>", { status: 403 });

    const report = await purgeArticleAssets(article, { quiet: true });
    expect(report.keys.length).toBeGreaterThan(0);
    expect(report.failed.length).toBeGreaterThan(0);
    // Reported, never thrown: the row still has to come out of the database.
    expect(report.deleted).toEqual([]);
  });

  it("proceeds with the columns when the content body cannot be fetched", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("missing", { status: 404 })));
    state.responder = () => new Response("", { status: 200 });

    const report = await purgeArticleAssets(article, { quiet: true });
    expect(report.note).toBeTruthy();
    const body = state.calls.find((call) => call.method === "POST")?.body ?? "";
    expect(body).toContain("<Key>articles/content-art_1.json</Key>");
    expect(body).toContain("<Key>xsypher/articles/2026/10/featured.png</Key>");
  });

  it("does nothing at all when R2 is not configured", async () => {
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    const report = await purgeArticleAssets(article);
    expect(report.keys).toEqual([]);
    expect(report.note).toBeTruthy();
    expect(state.calls).toEqual([]);
  });
});
