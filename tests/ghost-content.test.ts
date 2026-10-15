// ─────────────────────────────────────────────────────────────────────────────
// Ghost content classification and orphan detection
// ─────────────────────────────────────────────────────────────────────────────
//
// The two decisions a cleanup run is built on. Both are pure, so both are
// testable without a database or a bucket — which is the point: the destructive
// script around them should be the only part that cannot be rehearsed.

import { describe, expect, it } from "vitest";
import {
  classifyGhostArticle,
  findOrphanObjects,
  orphanedContentBlobIds,
  type SweepableObject,
} from "@/lib/ghost-content";

describe("classifyGhostArticle — fixtures", () => {
  it("recognises the fixtures that were actually deleted from the dashboard", () => {
    const tiptap = classifyGhostArticle({
      title: "Tiptap Editor: Ultimate Testing Document",
      slug: "tiptap-editor-ultimate-testing-document",
    });
    expect(tiptap?.confidence).toBe("confirmed");
    expect(tiptap?.reasons.join(" ")).toContain("tiptap editor");

    const homenest = classifyGhostArticle({ title: "Homenest Movers", slug: "homenest-movers" });
    expect(homenest?.confidence).toBe("confirmed");
  });

  it("recognises the fixture slugs the generator produced", () => {
    for (const slug of ["test", "test-post", "test-2", "dummy-post", "untitled", "lorem-ipsum", "my-first-post", "copy-of-review"]) {
      expect(classifyGhostArticle({ title: "A perfectly ordinary headline", slug })?.confidence, slug).toBe(
        "confirmed",
      );
    }
  });

  it("reads the slug the way a reader does, so dashed fixture names still match", () => {
    // "testing-document" is not in any list; it matches the phrase once the
    // dashes become spaces.
    expect(classifyGhostArticle({ title: "", slug: "testing-document" })?.confidence).toBe("confirmed");
  });

  it("accepts extra phrases from the operator", () => {
    const verdict = classifyGhostArticle({
      title: "Notes from a staging import",
      slug: "notes-from-a-staging-import",
      extraPhrases: ["staging import"],
    });
    expect(verdict?.confidence).toBe("confirmed");
    expect(verdict?.reasons.join(" ")).toContain("staging import");
  });
});

describe("classifyGhostArticle — Roman Urdu", () => {
  it("flags a Roman Urdu draft as probable, with the words that matched", () => {
    const verdict = classifyGhostArticle({
      title: "Yeh article kya hai aur kaise likha gaya",
      slug: "yeh-article-kya-hai",
    });
    // "yeh article" is not in the phrase list, so this rides on the markers.
    expect(verdict?.confidence).toBe("probable");
    expect(verdict?.reasons.join(" ")).toContain("Roman Urdu");
  });

  it("does not flag English copy that merely contains an Urdu-looking word", () => {
    expect(classifyGhostArticle({ title: "The Linux kernel and you", slug: "linux-kernel-and-you" })).toBeNull();
    expect(classifyGhostArticle({ title: "Google's AI Overviews, one year on", slug: "ai-overviews-one-year-on" })).toBeNull();
  });
});

describe("classifyGhostArticle — real headlines", () => {
  it("leaves genuine reporting alone", () => {
    const headlines: { title: string; slug: string }[] = [
      { title: "Test data breaches at GitHub expose enterprise tokens", slug: "test-data-breaches-at-github" },
      { title: "Sample rate conversion, explained", slug: "sample-rate-conversion-explained" },
      { title: "Dummy variables in regression models", slug: "dummy-variables-in-regression" },
      { title: "The movers behind Kubernetes' scheduler rewrite", slug: "movers-behind-kubernetes-scheduler" },
      { title: "Hello, World: fifty years of the first program", slug: "hello-world-fifty-years" },
    ];

    for (const headline of headlines) {
      const verdict = classifyGhostArticle(headline);
      // Null, or a *probable* verdict the operator has to look at. Never the
      // auto-delete tier: a fixture word inside a real headline is not proof.
      expect(verdict?.confidence ?? null, headline.slug).not.toBe("confirmed");
    }
  });

  it("returns null rather than something falsy-but-informative", () => {
    expect(classifyGhostArticle({ title: "Nvidia's next GPU", slug: "nvidia-next-gpu" })).toBeNull();
    expect(classifyGhostArticle({})).toBeNull();
    expect(classifyGhostArticle({ title: null, slug: null, deck: null })).toBeNull();
  });

  it("flags a bare placeholder title at the review tier", () => {
    const verdict = classifyGhostArticle({ title: "Test (2)", slug: "some-real-slug-here" });
    expect(verdict?.confidence).toBe("probable");
  });
});

describe("findOrphanObjects", () => {
  const now = new Date("2026-10-15T00:00:00.000Z");
  const day = 24 * 60 * 60 * 1000;
  const object = (key: string, ageDays: number): SweepableObject => ({
    key,
    size: 1024,
    lastModified: new Date(now.getTime() - ageDays * day),
  });

  it("deletes only what nothing references", () => {
    const objects = [object("xsypher/articles/a.png", 10), object("xsypher/articles/b.png", 10)];
    const orphans = findOrphanObjects(objects, new Set(["xsypher/articles/a.png"]), { now });
    expect(orphans.map((o) => o.key)).toEqual(["xsypher/articles/b.png"]);
  });

  it("honours the grace window so a fresh upload is never swept", () => {
    const objects = [object("xsypher/articles/fresh.png", 1), object("xsypher/articles/old.png", 30)];
    const orphans = findOrphanObjects(objects, new Set(), { now, graceMs: 7 * day });
    expect(orphans.map((o) => o.key)).toEqual(["xsypher/articles/old.png"]);
  });

  it("ignores entries without a key", () => {
    expect(findOrphanObjects([{ key: "", lastModified: new Date(0) }], new Set(), { now })).toEqual([]);
  });
});

describe("orphanedContentBlobIds", () => {
  it("matches the content blob naming scheme the save path uses", () => {
    const keys = ["articles/content-abc123.json", "xsypher/articles/2026/10/photo.png"];
    expect(orphanedContentBlobIds(keys, new Set())).toEqual([{ key: "articles/content-abc123.json", articleId: "abc123" }]);
  });

  it("keeps blobs whose article still exists", () => {
    const keys = ["articles/content-abc123.json"];
    expect(orphanedContentBlobIds(keys, new Set(["abc123"]))).toEqual([]);
  });

  it("does not mistake an unrelated json object for a content blob", () => {
    expect(orphanedContentBlobIds(["articles/metadata.json", "articles/content.json"], new Set())).toEqual([]);
  });
});
