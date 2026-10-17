// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The studio is a client island inside the admin console: the
// router comes from next/navigation and must be stubbed for a
// jsdom mount.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/editor",
  useSearchParams: () => new URLSearchParams(),
}));

// PublishingPanel and the theme-aware chrome consult
// matchMedia; jsdom does not implement it.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      // The studio's docked panes only exist on wide screens;
      // report desktop for min-width queries so the inspector
      // renders its aside rather than the mobile sheet.
      matches: query.startsWith("(min-width"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  (globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;
});

import ArticleEditor from "@/components/editorial/ArticleEditor";

const initialData = {
  id: "studio-test-article",
  title: "Studio layout smoke test",
  deck: "Verifies the MS Word studio shell renders.",
  slug: "studio-layout-smoke-test",
  cat: "ai",
  categoryParentSlug: "",
  tags: "",
  img: "",
  featuredImageAlt: "",
  featuredImageCaption: "",
  featuredImageCredit: "",
  author: "Smoke Tester",
  isAnonymous: false,
  status: "DRAFT",
  seoTitle: "",
  seoDesc: "",
  bodyHtml: "<p>Start writing the story…</p>",
};

describe("MS Word studio shell", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the ribbon, three docks and the status bar", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ArticleEditor
          initialData={initialData}
          userRole="ADMIN"
          authorName="Smoke Tester"
          authorRole="EDITOR"
          authorId={null}
          availableAuthors={[]}
        />,
      );
      await new Promise(resolve => setTimeout(resolve, 60));
    });

    // Row 1 + Row 2 of the ribbon are present and the floating
    // placeholder text is gone.
    expect(container.querySelector(".studio-ribbon-header")).toBeTruthy();
    expect(container.querySelector(".studio-title-bar")).toBeTruthy();
    expect(container.querySelector(".studio-ribbon-row")).toBeTruthy();
    expect(container.textContent).not.toContain("A space for your next great story");

    // Three-pane docked workspace: outline dock, center canvas,
    // inspector dock — all present and docked.
    expect(container.querySelector(".studio-workspace")).toBeTruthy();
    expect(container.querySelector(".studio-outline")).toBeTruthy();
    expect(container.querySelector(".studio-canvas")).toBeTruthy();
    expect(container.querySelector(".studio-desktop-inspector")).toBeTruthy();

    // The MS Word page sheet lives on the canvas.
    expect(container.querySelector(".studio-paper")).toBeTruthy();

    // Unified status bar: metrics on the left, sync + focus +
    // zoom on the right.
    const status = container.querySelector(".studio-status");
    expect(status).toBeTruthy();
    expect(status?.textContent).toContain("words");
    expect(status?.textContent).toContain("min read");
    expect(status?.textContent).toContain("characters");
    expect(status?.textContent).toContain("Focus");
    expect(container.querySelectorAll(".studio-zoom-btn")).toHaveLength(3);

    // Dock toggles in the ribbon title bar.
    const toggles = container.querySelectorAll(".studio-dock-toggle");
    expect(toggles.length).toBe(2);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("collapses the outline dock through the ribbon toggle", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ArticleEditor
          initialData={initialData}
          userRole="ADMIN"
          authorName="Smoke Tester"
          authorRole="EDITOR"
          authorId={null}
          availableAuthors={[]}
        />,
      );
      await new Promise(resolve => setTimeout(resolve, 60));
    });

    expect(container.querySelector(".studio-outline")).toBeTruthy();

    const outlineToggle = container.querySelectorAll(".studio-dock-toggle")[0];
    await act(async () => {
      outlineToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    // The outline dock unmounts; the canvas and inspector stay.
    expect(container.querySelector(".studio-outline")).toBeNull();
    expect(container.querySelector(".studio-canvas")).toBeTruthy();
    expect(container.querySelector(".studio-desktop-inspector")).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("collapses the post-settings dock through the ribbon toggle", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ArticleEditor
          initialData={initialData}
          userRole="ADMIN"
          authorName="Smoke Tester"
          authorRole="EDITOR"
          authorId={null}
          availableAuthors={[]}
        />,
      );
      await new Promise(resolve => setTimeout(resolve, 60));
    });

    expect(container.querySelector(".studio-desktop-inspector")).toBeTruthy();

    const inspectorToggle = container.querySelectorAll(".studio-dock-toggle")[1];
    await act(async () => {
      inspectorToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    // The right dock unmounts; the outline stays docked.
    expect(container.querySelector(".studio-desktop-inspector")).toBeNull();
    expect(container.querySelector(".studio-outline")).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
