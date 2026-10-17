import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import middleware from "../middleware";

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 410 Gone interception in middleware
// ─────────────────────────────────────────────────────────────────────────────
//
// A permanently deleted article slug must answer 410 — not 404 —
// so Google drops the URL on the next crawl instead of retrying
// it for weeks. The 410 is produced by the middleware, before any
// routing or database work: the compiled-in tombstone registry is
// matched in-process, and the runtime half comes from a cached
// manifest, never from Neon.
//
// These tests pin:
//   • the status code, the X-Robots-Tag header and the noindex
//     meta tag on the 410 document;
//   • that a known deleted slug 410s with ZERO fetches and ZERO
//     session decodes (the no-database-wakeup guarantee);
//   • that a dynamically tombstoned slug 410s via the manifest;
//   • that live and never-existing slugs still pass through to
//     the article route (which answers 200 and 404 respectively).
// ─────────────────────────────────────────────────────────────────────────────

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({ default: () => ({ auth }) }));

/**
 * The middleware keeps its manifest cache in module state with a
 * 30s TTL. Each test starts the fake clock strictly later than
 * the last, so a manifest cached by a previous test is always
 * expired and every test observes its own stub.
 */
let fakeClock = 0;

/** Point the middleware's manifest fetch at a controlled response. */
function stubManifest(slugs: string[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ slugs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  fakeClock += 1_000_000; // 1000s per test: always past any TTL
  vi.setSystemTime(fakeClock);
  vi.stubEnv("IS_LOCAL_DEV", "false");
  vi.stubEnv("NEXTAUTH_URL", "https://admin.xsypher.com");
  auth.mockResolvedValue(null);
  // Default: an empty runtime registry, so the static half is
  // what answers unless a test says otherwise.
  stubManifest([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deleted slugs answer 410 Gone at the edge", () => {
  it.each([
    "/article/tiptap-editor",
    "/article/ultimate-testing-document",
    "/article/tiptap-editor-ultimate-testing-document",
    "/article/test-post",
    "/article/dummy",
    "/article/lorem-ipsum",
    "/articles/tiptap-editor", // the /articles/ alias is covered too
    "/article/tmp-draft-2", // generator-shaped fixture slugs
  ])("returns 410 for %s", async (path) => {
    const response = await middleware(
      new NextRequest(`https://xsypher.com${path}`, { headers: { host: "xsypher.com" } }),
    );

    expect(response.status).toBe(410);
    // The header form of the robots instruction, for crawlers
    // that never read HTML.
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");

    const body = await response.text();
    // The meta form, for crawlers that render the document.
    expect(body).toContain('<meta name="robots" content="noindex, nofollow" />');
    // Styled, on-brand, and cacheable at the edge so retries
    // never re-invoke the Worker.
    expect(body).toContain("410");
    expect(body).toContain("prefers-color-scheme");
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toContain("s-maxage");
  });

  it("answers a known deleted slug with zero I/O — no manifest fetch, no session decode", async () => {
    const response = await middleware(
      new NextRequest("https://xsypher.com/article/tiptap-editor", {
        headers: { host: "xsypher.com" },
      }),
    );

    expect(response.status).toBe(410);
    // The compiled-in registry matched in-process: neither the
    // manifest endpoint nor the database (nor Auth.js, whose
    // decode is the middleware's only other I/O) was touched.
    expect(fetch).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled();
  });

  it("410s a slug deleted from the dashboard at runtime, via the cached manifest", async () => {
    stubManifest(["roman-urdu-test-post", "another-deleted-story"]);

    const response = await middleware(
      new NextRequest("https://xsypher.com/article/roman-urdu-test-post", {
        headers: { host: "xsypher.com" },
      }),
    );

    expect(response.status).toBe(410);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("re-fetches the manifest only after its TTL expires", async () => {
    stubManifest(["freshly-deleted"]);

    const first = await middleware(
      new NextRequest("https://xsypher.com/article/freshly-deleted", {
        headers: { host: "xsypher.com" },
      }),
    );
    expect(first.status).toBe(410);
    expect(fetch).toHaveBeenCalledTimes(1);

    // Within the TTL window the manifest is served from memory.
    await middleware(
      new NextRequest("https://xsypher.com/article/freshly-deleted", {
        headers: { host: "xsypher.com" },
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(31_000);
    await middleware(
      new NextRequest("https://xsypher.com/article/freshly-deleted", {
        headers: { host: "xsypher.com" },
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails open when the manifest cannot be fetched: static tombstones still 410, live slugs pass", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("origin unreachable")),
    );

    const gone = await middleware(
      new NextRequest("https://xsypher.com/article/tiptap-editor", {
        headers: { host: "xsypher.com" },
      }),
    );
    expect(gone.status).toBe(410);

    const live = await middleware(
      new NextRequest("https://xsypher.com/article/a-live-story", {
        headers: { host: "xsypher.com" },
      }),
    );
    expect(live.status).toBe(200);
  });
});

describe("everything else keeps its existing behaviour", () => {
  it.each([
    "/article/how-nginx-really-works", // a live article: the page answers 200
    "/article/a-slug-that-never-existed", // never an article: the page answers 404
    "/article/", // no slug at all
    "/articles", // the listing route, not an article
    "/latest",
    "/",
  ])("passes %s through to routing", async (path) => {
    const response = await middleware(
      new NextRequest(`https://xsypher.com${path}`, { headers: { host: "xsypher.com" } }),
    );
    expect(response.status).toBe(200);
    expect(auth).not.toHaveBeenCalled();
  });

  it("keeps the www → apex redirect ahead of the 410 check", async () => {
    const response = await middleware(
      new NextRequest("https://www.xsypher.com/article/tiptap-editor", {
        headers: { host: "www.xsypher.com" },
      }),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://xsypher.com/article/tiptap-editor");
  });

  it("still applies the security headers to the 410 document", async () => {
    const response = await middleware(
      new NextRequest("https://xsypher.com/article/tiptap-editor", {
        headers: { host: "xsypher.com" },
      }),
    );
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(response.headers.get("content-security-policy")).toContain("script-src");
  });
});
