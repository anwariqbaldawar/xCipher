// ─────────────────────────────────────────────────────────────────────────────
// Ghost content detection
// ─────────────────────────────────────────────────────────────────────────────
//
// Two decisions live here, and both are destructive when they are wrong:
//
//   classifyGhostArticle — calling a real story a fixture would delete it
//   findOrphanObjects    — calling a live object an orphan would break an image
//
// So the tests state the false-positive side explicitly (a real headline, a
// single stray Roman Urdu word, an unreferenced object uploaded a minute ago),
// not just the happy path.

import { describe, expect, it } from "vitest";
import {
  GHOST_PHRASES,
  classifyGhostArticle,
  findOrphanObjects,
  type SweepableObject,
} from "@/lib/ghost-content";

describe("classifyGhostArticle — confirmed fixtures", () => {
  it("catches the fixtures that were actually indexed", () => {
    const tiptap = classifyGhostArticle({
      title: "Tiptap Editor: Ultimate Testing Document",
      slug: "tiptap-editor-ultimate-testing-document",
    });
    expect(tiptap?.confidence).toBe("confirmed");
    expect(tiptap?.reasons.join(" ")).toContain("tiptap editor");

    const homenest = classifyGhostArticle({ title: "Homenest Movers Truck", slug: "homenest-movers-truck" });
    expect(homenest?.confidence).toBe("confirmed");
    expect(homenest?.reasons.join(" ")).toContain("homenest");
  });

  it("catches a fixture by slug alone", () => {
    expect(classifyGhostArticle({ title: "Quarterly chip outlook", slug: "test-post" })?.confidence).toBe("confirmed");
    expect(classifyGhostArticle({ title: "Quarterly chip outlook", slug: "test-page" })?.confidence).toBe("confirmed");
    expect(classifyGhostArticle({ title: "Quarterly chip outlook", slug: "test-3" })?.reasons.join(" ")).toContain("slug matches");
    expect(classifyGhostArticle({ title: "Quarterly chip outlook", slug: "draft-12" })?.confidence).toBe("confirmed");
  });

  it("keeps copies in the review tier: a duplicate can be somebody's work in progress", () => {
    const verdict = classifyGhostArticle({ title: "Quarterly chip outlook", slug: "copy-of-review" });
    expect(verdict?.confidence).toBe("probable");
    expect(verdict?.reasons.join(" ")).toContain('starts with "copy-of-"');
  });

  it("reads the fixture evidence out of the deck as well as the title", () => {
    const verdict = classifyGhostArticle({ title: "Untitled", slug: "notes", deck: "Just a test of the new editor." });
    expect(verdict?.confidence).toBe("confirmed");
  });

  it("accepts extra phrases from the command line", () => {
    const verdict = classifyGhostArticle({ title: "Draft about fibre", slug: "fibre", extraPhrases: ["about fibre"] });
    expect(verdict?.confidence).toBe("confirmed");
    expect(verdict?.reasons.join(" ")).toContain("about fibre");
  });
});

describe("classifyGhostArticle — probable fixtures", () => {
  it("flags Roman Urdu only on two distinct markers", () => {
    const verdict = classifyGhostArticle({
      title: "Yeh article bahut acha hai, lekin adhoora",
      slug: "yeh-article",
    });
    expect(verdict?.confidence).toBe("probable");
    expect(verdict?.reasons.join(" ")).toContain("Roman Urdu");
  });

  it("does not flag a single marker hidden inside a longer word", () => {
    // "aur" must not match Aurora, and one token is not a language.
    expect(classifyGhostArticle({ title: "Aurora over Kaur Valley", slug: "aurora-kaur" })).toBeNull();
    expect(classifyGhostArticle({ title: "Theek pricing for GPUs", slug: "gpu-pricing" })).toBeNull();
  });
});

describe("classifyGhostArticle — real editorial work", () => {
  it("leaves genuine headlines alone", () => {
    const real = [
      { title: "Apple's M5 MacBook Pro review: the efficiency story", slug: "apple-m5-macbook-pro-review" },
      { title: "Pakistan's 5G auction is delayed again", slug: "pakistan-5g-auction-delayed" },
      { title: "Samsung's newest tablet, reviewed", slug: "samsung-tablet-review" },
    ];
    for (const article of real) {
      expect(classifyGhostArticle(article), article.slug).toBeNull();
    }
  });

  it("reports a plausible story whose slug merely starts with test- for review, never as confirmed", () => {
    // "Test data leaks into production" is a story this site could actually
    // publish. Its slug matches the fixture prefix rule, so it is surfaced —
    // but only in the tier that needs a human, which is what keeps a delete run
    // from taking real work with it.
    const verdict = classifyGhostArticle({
      title: "Test data leaks into production",
      slug: "test-data-leaks-production",
    });
    expect(verdict?.confidence).toBe("probable");
    expect(verdict?.reasons.join(" ")).toContain('starts with "test-"');
  });

  it("keeps a suffix-only fixture shape in the review tier too", () => {
    expect(classifyGhostArticle({ title: "NVMe SSD test", slug: "nvme-ssd-test" })?.confidence).toBe("probable");
  });

  it("treats Hello World as reviewable, not conclusive", () => {
    expect(classifyGhostArticle({ title: "Hello World", slug: "hello-world-variants" })?.confidence).toBe("probable");
    // …while the classic first-post slug is still conclusive on its own.
    expect(classifyGhostArticle({ title: "Hello World", slug: "hello-world" })?.confidence).toBe("confirmed");
  });

  it("never treats a missing verdict as a negative one", () => {
    expect(classifyGhostArticle({})).toBeNull();
    expect(classifyGhostArticle({ title: null, slug: null })).toBeNull();
  });
});

describe("GHOST_PHRASES", () => {
  it("has no blank entries that would match everything", () => {
    expect(GHOST_PHRASES.filter((phrase) => !phrase.trim())).toEqual([]);
    expect(GHOST_PHRASES.every((phrase) => phrase === phrase.toLowerCase())).toBe(true);
  });
});

describe("findOrphanObjects", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");
  const object = (key: string, ageDays?: number): SweepableObject => ({
    key,
    lastModified: ageDays === undefined ? null : new Date(now.getTime() - ageDays * 86_400_000),
  });

  it("returns only objects no reference mentions", () => {
    const objects = [object("kept.png", 30), object("ghost-truck.png", 30)];
    const orphans = findOrphanObjects(objects, new Set(["kept.png"]), { now });
    expect(orphans.map((entry) => entry.key)).toEqual(["ghost-truck.png"]);
  });

  it("keeps anything inside the grace window so an in-flight upload survives", () => {
    const objects = [object("just-uploaded.png", 0.01), object("old-ghost.png", 30)];
    const orphans = findOrphanObjects(objects, new Set(), { now, graceMs: 7 * 86_400_000 });
    expect(orphans.map((entry) => entry.key)).toEqual(["old-ghost.png"]);
  });

  it("keeps an object it cannot age while a grace window is in force", () => {
    // With no timestamp there is no way to prove the object is old enough.
    expect(findOrphanObjects([object("undated.png")], new Set(), { now, graceMs: 86_400_000 })).toEqual([]);
    // Without a grace window the same object is an orphan.
    expect(findOrphanObjects([object("undated.png")], new Set(), { now }).map((entry) => entry.key)).toEqual(["undated.png"]);
  });

  it("is a pure filter: no input object is mutated or reordered", () => {
    const objects = [object("a.png", 30), object("b.png", 30)];
    const live = new Set<string>();
    const first = findOrphanObjects(objects, live, { now });
    const second = findOrphanObjects(objects, live, { now });
    expect(first.map((entry) => entry.key)).toEqual(second.map((entry) => entry.key));
    expect(objects.map((entry) => entry.key)).toEqual(["a.png", "b.png"]);
  });
});
