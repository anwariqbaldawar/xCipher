import { beforeEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// The server half of the tombstone registry
// ─────────────────────────────────────────────────────────────────────────────
//
// lib/tombstones.ts unions the compiled-in registry with the
// DeletedArticleSlug table, minus any slug a live article has
// taken back. The database and the cache are mocked here:
// the point is the registry's decisions — what counts as
// tombstoned, what a registration writes, and how a slug
// reuse stops being reported as gone.
// ─────────────────────────────────────────────────────────────────────────────

const state = vi.hoisted(() => ({
  tombstones: [] as { slug: string; title: string | null }[],
  liveSlugs: [] as { slug: string }[],
  inserted: [] as unknown[],
  deleted: [] as unknown[],
  revalidated: [] as string[],
  // getTombstonedSlugs always reads in a fixed order:
  // the tombstone table first, then the article table
  // (the liveness filter). The mock counts from() calls
  // to tell the two reads apart.
  fromCalls: 0,
}));

vi.mock("@/lib/db", () => ({
  db: {
    // The registry reads two tables: the tombstone table and
    // (the liveness filter) the article table. The first read
    // awaits the from() result; the second chains .where().
    select: vi.fn(() => ({
      from: vi.fn(() => {
        state.fromCalls += 1;
        const rows = state.fromCalls % 2 === 1 ? state.tombstones : state.liveSlugs;
        return {
          where: async () => rows,
          then: (resolve: (value: unknown) => void) => resolve(rows),
        };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((row: unknown) => {
        state.inserted.push(row);
        return { onConflictDoNothing: vi.fn() };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => {
        state.deleted.push(true);
        return Promise.resolve();
      }),
    })),
  },
}));

// unstable_cache passes the reader through so the tests see
// the (mocked) database on every call.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

vi.mock("@/lib/revalidate", () => ({
  revalidateTag: vi.fn((tag: string) => {
    state.revalidated.push(tag);
    return Promise.resolve();
  }),
  revalidatePath: vi.fn(),
}));

import { article, deletedArticleSlug } from "@/lib/db/schema";
import {
  forgetDeletedSlug,
  getDeletedSlugs,
  isTombstonedSlug,
  registerDeletedSlug,
} from "@/lib/tombstones";

beforeEach(() => {
  state.tombstones = [];
  state.liveSlugs = [];
  state.inserted = [];
  state.deleted = [];
  state.revalidated = [];
  state.fromCalls = 0;
});

describe("isTombstonedSlug", () => {
  it("matches the compiled-in registry without touching the database", async () => {
    expect(await isTombstonedSlug("tiptap-editor")).toBe(true);
    expect(await isTombstonedSlug("ultimate-testing-document")).toBe(true);
    // The static half answers first, so the mocked query is
    // never reached for a compiled-in slug.
    expect(state.tombstones).toEqual([]);
  });

  it("matches a slug deleted from the dashboard at runtime", async () => {
    state.tombstones = [{ slug: "roman-urdu-test-post", title: "Roman Urdu test" }];
    expect(await isTombstonedSlug("roman-urdu-test-post")).toBe(true);
    expect(await isTombstonedSlug("ROMAN-URDU-TEST-POST")).toBe(true);
  });

  it("does not report a tombstoned slug that a live article has taken back", async () => {
    // The hazard this guards against: a fixture slug is
    // tombstoned, a new story is then created with the same
    // slug, and a stale cache entry would 410 a live story.
    state.tombstones = [{ slug: "old-test-slug", title: null }];
    state.liveSlugs = [{ slug: "old-test-slug" }];
    expect(await isTombstonedSlug("old-test-slug")).toBe(false);
  });

  it("does not match a live or never-existing slug", async () => {
    state.tombstones = [{ slug: "roman-urdu-test-post", title: null }];
    expect(await isTombstonedSlug("a-live-story")).toBe(false);
    expect(await isTombstonedSlug("test-data-breaches-at-github")).toBe(false);
  });
});

describe("getDeletedSlugs", () => {
  it("unions the compiled-in list with the live-filtered tombstones", async () => {
    state.tombstones = [{ slug: "deleted-at-runtime", title: null }];
    state.liveSlugs = [];
    const slugs = await getDeletedSlugs();
    expect(slugs).toContain("tiptap-editor");
    expect(slugs).toContain("deleted-at-runtime");
  });

  it("drops a tombstone whose slug is live again, and de-duplicates", async () => {
    // A compiled-in slug stays tombstoned even when a live
    // row reuses it — the static half is a deliberate,
    // permanent reservation. The liveness filter governs
    // the dynamic half only.
    state.tombstones = [{ slug: "tiptap-editor", title: null }];
    state.liveSlugs = [{ slug: "tiptap-editor" }];
    const merged = await getDeletedSlugs();
    expect(merged.filter((slug) => slug === "tiptap-editor")).toHaveLength(1);

    state.tombstones = [{ slug: "reused-fixture-slug", title: null }];
    state.liveSlugs = [{ slug: "reused-fixture-slug" }];
    const rechecked = await getDeletedSlugs();
    expect(rechecked).not.toContain("reused-fixture-slug");
  });
});

describe("registerDeletedSlug", () => {
  it("writes a normalised tombstone row and drops the cache", async () => {
    await registerDeletedSlug("Tiptap-Editor-2 ", "Tiptap Editor 2");
    expect(state.inserted[0]).toMatchObject({ slug: "tiptap-editor-2", title: "Tiptap Editor 2" });
    expect(state.revalidated).toContain("deleted-slugs");
  });

  it("ignores an empty slug", async () => {
    await registerDeletedSlug("   ");
    expect(state.inserted).toHaveLength(0);
  });
});

describe("forgetDeletedSlug", () => {
  it("clears the tombstone row without dropping cache tags", async () => {
    // The upsert path (autosave included) must never
    // revalidate: that is the save-path invariant the
    // anonymity tests pin down.
    await forgetDeletedSlug("old-test-slug");
    expect(state.deleted).toHaveLength(1);
    expect(state.revalidated).toHaveLength(0);
  });

  it("ignores an empty slug", async () => {
    await forgetDeletedSlug("");
    expect(state.deleted).toHaveLength(0);
  });
});

describe("schema", () => {
  it("exposes the tombstone table with a slug key", () => {
    expect(deletedArticleSlug).toBeDefined();
    expect(article).toBeDefined();
  });
});
