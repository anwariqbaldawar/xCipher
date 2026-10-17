// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import SeoAuditPanel from "@/components/console/SeoAuditPanel";
import CategoryCoveragePanel from "@/components/console/CategoryCoveragePanel";
import type { EditorialAuditEntry } from "@/lib/cached-queries";

(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;

// Both widgets are pure functions of the cached audit index,
// so they mount without any console chrome around them.
async function mount(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(ui);
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

const entry = (overrides: Partial<EditorialAuditEntry>): EditorialAuditEntry => ({
  id: "a1",
  slug: "story",
  status: "PUBLISHED",
  title: "A story",
  deck: null,
  seoTitle: null,
  seoDesc: null,
  img: null,
  featuredImageAlt: null,
  readingTime: 2,
  views: 100,
  updatedAt: new Date(),
  categorySlug: "ai",
  categoryName: "AI",
  ...overrides,
});

describe("SeoAuditPanel", () => {
  it("flags short meta titles and missing images with fix links", async () => {
    const articles = [
      entry({ title: "Short", seoTitle: "Short" }),                       // title too short
      entry({ id: "a2", slug: "complete", title: "A complete story title", seoTitle: "A complete story title", seoDesc: "A meta description that is comfortably inside the recommended seventy to one hundred sixty character window.", img: "https://cdn.xsypher.com/cover.jpg", featuredImageAlt: "Cover", deck: "Deck" }),
      entry({ id: "a3", slug: "no-image", title: "Another adequately long story title", seoDesc: "A meta description that is comfortably inside the recommended seventy to one hundred sixty character window.", deck: "Deck" }),
    ];
    const { container, unmount } = await mount(<SeoAuditPanel articles={articles} />);

    expect(container.textContent).toContain("Meta title length");
    expect(container.textContent).toContain("Featured image present");
    // The two failing stories each get a 1-click Fix link.
    const fixLinks = Array.from(container.querySelectorAll("a[href^='/admin/editor/']"));
    expect(fixLinks.length).toBeGreaterThanOrEqual(2);
    expect(fixLinks.some(a => a.getAttribute("href") === "/admin/editor/a1")).toBe(true);
    expect(fixLinks.some(a => a.getAttribute("href") === "/admin/editor/a3")).toBe(true);
    // The fully-specified story is counted as passing everywhere.
    expect(container.textContent).toContain("2/3");

    unmount();
  });

  it("reports zero-division health as fully ready on an empty corpus", async () => {
    const { container, unmount } = await mount(<SeoAuditPanel articles={[]} />);
    expect(container.textContent).toContain("0 stories audited");
    expect(container.textContent).toContain("Nothing to audit yet");
    unmount();
  });
});

describe("CategoryCoveragePanel", () => {
  it("aggregates volume and reads per beat with share percentages", async () => {
    const articles = [
      entry({ id: "c1", slug: "ai-one", categorySlug: "ai", categoryName: "AI", views: 900 }),
      entry({ id: "c2", slug: "ai-two", categorySlug: "ai", categoryName: "AI", views: 100 }),
      entry({ id: "c3", slug: "sec-one", categorySlug: "cybersecurity", categoryName: "Cybersecurity", views: 400 }),
      // Drafts stay out of the readership picture.
      entry({ id: "c4", slug: "draft", status: "DRAFT", categorySlug: "ai", categoryName: "AI", views: 9999 }),
    ];
    const { container, unmount } = await mount(<CategoryCoveragePanel articles={articles} />);

    expect(container.textContent).toContain("AI");
    expect(container.textContent).toContain("Cybersecurity");
    // AI: 2 stories, 1000 reads, 1000/1400 = 71%
    expect(container.textContent).toContain("2 stories");
    expect(container.textContent).toContain("1K reads");
    expect(container.textContent).toContain("71%");
    // The draft's views never counted toward the total.
    expect(container.textContent).not.toContain("10,999");

    const bars = container.querySelectorAll("[role='img']");
    expect(bars.length).toBe(2);

    unmount();
  });
});
