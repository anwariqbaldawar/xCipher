// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import SocialLinks, { SOCIAL_LINKS } from "@/components/common/SocialLinks";
import { SocialIcon } from "@/components/common/SocialIcon";

// ─────────────────────────────────────────────────────────────────────────────
// Official social set: one component, one order, everywhere it appears.
// Facebook → Threads → Instagram → LinkedIn → X → Reddit.
// ─────────────────────────────────────────────────────────────────────────────

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("official social links", () => {
  it("renders the six profiles in the strict display order", async () => {
    await act(() => root.render(<SocialLinks />));

    const anchors = [...container.querySelectorAll("a")];
    expect(anchors.map((a) => a.getAttribute("aria-label"))).toEqual([
      "Facebook",
      "Threads",
      "Instagram",
      "LinkedIn",
      "X",
      "Reddit",
    ]);
    expect(SOCIAL_LINKS.map((link) => link.platform)).toEqual([
      "facebook",
      "threads",
      "instagram",
      "linkedin",
      "x",
      "reddit",
    ]);
  });

  it("links Reddit to r/xsypher in a new tab with noopener noreferrer", async () => {
    await act(() => root.render(<SocialLinks />));

    const reddit = container.querySelector<HTMLAnchorElement>('a[aria-label="Reddit"]')!;
    expect(reddit).not.toBeNull();
    expect(reddit.getAttribute("href")).toBe("https://www.reddit.com/r/xsypher/");
    expect(reddit.getAttribute("target")).toBe("_blank");
    expect(reddit.getAttribute("rel")).toBe("noopener noreferrer");

    for (const anchor of container.querySelectorAll("a")) {
      expect(anchor.getAttribute("target")).toBe("_blank");
      expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("has real Reddit and Threads glyphs, not the fallback globe", async () => {
    await act(() =>
      root.render(
        <div>
          <span data-platform="reddit"><SocialIcon platform="reddit" /></span>
          <span data-platform="threads"><SocialIcon platform="threads" /></span>
          <span data-platform="unknown"><SocialIcon platform="myspace" /></span>
        </div>,
      ),
    );

    const glyph = (platform: string) =>
      container.querySelector(`[data-platform="${platform}"] svg`)!.innerHTML;
    expect(glyph("reddit")).not.toBe(glyph("unknown"));
    expect(glyph("threads")).not.toBe(glyph("unknown"));
    expect(glyph("reddit")).not.toBe(glyph("threads"));
  });

  it("is the set the footer, About, Contact and drawer render", () => {
    const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");
    for (const file of [
      "components/layout/SiteFooter.tsx",
      "components/layout/MobileDrawer.tsx",
      "app/(public)/page/about/page.tsx",
      "app/(public)/page/contact/ContactPageClient.tsx",
    ]) {
      expect(read(file), file).toContain("SocialLinks");
    }
  });
});
