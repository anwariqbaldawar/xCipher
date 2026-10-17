import { describe, expect, it } from "vitest";
import {
  DELETED_SLUG_PATTERNS,
  KNOWN_DELETED_SLUGS,
  isDeletedSlug,
} from "@/lib/deleted-slugs";

// ─────────────────────────────────────────────────────────────────────────────
// The edge half of the tombstone registry
// ─────────────────────────────────────────────────────────────────────────────
//
// isDeletedSlug runs in middleware on every /article/* request with
// zero I/O. The cost of a false positive is a live story buried
// under a 410; the cost of a false negative is a dead test URL
// answering 404 and lingering in the index. Both sides are pinned
// here, with the real-headline cases that must NEVER match.
// ─────────────────────────────────────────────────────────────────────────────

describe("the compiled-in tombstone list", () => {
  it("names the deleted Tiptap testing documents", () => {
    expect(KNOWN_DELETED_SLUGS).toContain("tiptap-editor");
    expect(KNOWN_DELETED_SLUGS).toContain("ultimate-testing-document");
    expect(KNOWN_DELETED_SLUGS).toContain("tiptap-editor-ultimate-testing-document");
  });

  it("covers every slug the ghost-content classifier treats as a fixture", () => {
    // Imported from lib/ghost-content so the registry and the
    // cleanup tool cannot drift apart.
    for (const slug of [
      "test", "testing", "test-post", "test-article", "test-document",
      "test-page", "post-test", "dummy", "dummy-post", "sample",
      "sample-post", "untitled", "hello-world", "my-first-post",
      "my-first-article", "lorem-ipsum",
    ]) {
      expect(KNOWN_DELETED_SLUGS).toContain(slug);
    }
  });

  it("matches known deleted slugs", () => {
    expect(isDeletedSlug("tiptap-editor")).toBe(true);
    expect(isDeletedSlug("ultimate-testing-document")).toBe(true);
    expect(isDeletedSlug("Tiptap-Editor")).toBe(true); // case-insensitive
    expect(isDeletedSlug("  ultimate-testing-document ")).toBe(true); // trimmed
  });

  it("matches unambiguous fixture slug shapes", () => {
    expect(isDeletedSlug("test-2")).toBe(true);
    expect(isDeletedSlug("testing_3")).toBe(true);
    expect(isDeletedSlug("dummy")).toBe(true);
    expect(isDeletedSlug("tmp-draft")).toBe(true);
    expect(isDeletedSlug("temp-note")).toBe(true);
    expect(isDeletedSlug("copy-of-story")).toBe(true);
    expect(isDeletedSlug("untitled-4")).toBe(true);
    expect(isDeletedSlug("lorem-ipsum-placeholder")).toBe(true);
    expect(isDeletedSlug("article-1234")).toBe(true);
    expect(isDeletedSlug("post-987")).toBe(true);
    expect(isDeletedSlug("draft-42")).toBe(true);
  });
});

describe("real headlines are never tombstoned", () => {
  // These are the false positives the ghost-content classifier
  // warns about: real stories whose slugs merely begin with or
  // contain a fixture word. A 410 here would bury a live article.
  it.each([
    "test-data-breaches-at-github", // real headline starting with "test"
    "sample-rate-conversion-in-audio", // real headline starting with "sample"
    "how-we-test-benchmarks", // contains "test" mid-slug
    "the-ultimate-testing-guide-for-cpus", // contains "testing"
    "dummy-variables-explained", // contains "dummy"
    "a-story-about-copying-files", // "copy" without the "-of-" marker
    "article-writing-tips", // "article-" prefix, but not article-<digits>
    "post-mortem-of-a-outage", // "post-" prefix, but not post-<digits>
    "drafting-a-constitution", // "draft" as a prefix word
    "untangling-the-web", // "untitled" ≠ "untangling"
  ])("does not match %s", (slug) => {
    expect(isDeletedSlug(slug)).toBe(false);
  });

  it("does not match empty or missing slugs", () => {
    expect(isDeletedSlug("")).toBe(false);
    expect(isDeletedSlug(null)).toBe(false);
    expect(isDeletedSlug(undefined)).toBe(false);
  });
});

describe("the pattern set stays anchored", () => {
  // An unanchored /test/ would 410 every article that merely
  // mentions testing. Every pattern must be anchored.
  it("every pattern is anchored at the start", () => {
    for (const pattern of DELETED_SLUG_PATTERNS) {
      expect(pattern.source.startsWith("^")).toBe(true);
    }
  });
});
