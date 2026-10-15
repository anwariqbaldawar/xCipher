import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Utility function capturing the headroom decision logic implemented in SiteHeader
export function resolveHeadroomState({
  pathname,
  scrollY,
  lastScrollY,
  currentState = false,
  accumulatedDelta = 0,
  lastDirection = null,
}: {
  pathname: string;
  scrollY: number;
  lastScrollY: number;
  currentState?: boolean;
  accumulatedDelta?: number;
  lastDirection?: "up" | "down" | null;
}): {
  isHidden: boolean;
  newAccumulatedDelta: number;
  newDirection: "up" | "down" | null;
} {
  const isArticlePage = Boolean(
    pathname && (pathname.startsWith("/article/") || pathname.includes("/article/"))
  );

  if (!isArticlePage) {
    return { isHidden: false, newAccumulatedDelta: 0, newDirection: null };
  }

  // Minimum scroll threshold (50px - 100px): below 70px, header never hides
  if (scrollY <= 70) {
    return { isHidden: false, newAccumulatedDelta: 0, newDirection: null };
  }

  const diff = scrollY - lastScrollY;
  if (diff === 0) {
    return { isHidden: currentState, newAccumulatedDelta: accumulatedDelta, newDirection: lastDirection };
  }

  const currentDirection = diff > 0 ? "down" : "up";
  let newDelta = accumulatedDelta;

  if (currentDirection !== lastDirection) {
    newDelta = 0;
  }
  newDelta += Math.abs(diff);

  if (currentDirection === "down" && scrollY > 70 && newDelta > 20) {
    return { isHidden: true, newAccumulatedDelta: newDelta, newDirection: currentDirection };
  } else if (currentDirection === "up" && newDelta > 15) {
    return { isHidden: false, newAccumulatedDelta: newDelta, newDirection: currentDirection };
  }

  return { isHidden: currentState, newAccumulatedDelta: newDelta, newDirection: currentDirection };
}

export function getHeaderTailwindClasses({
  isArticlePage,
  isHidden,
}: {
  isArticlePage: boolean;
  isHidden: boolean;
}): string {
  const baseClasses =
    "site-head sticky top-0 z-40 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:sticky md:top-0 md:translate-y-0";
  const dynamicTransform =
    isArticlePage && isHidden
      ? "-translate-y-full pointer-events-none md:pointer-events-auto"
      : "translate-y-0";
  return `${baseClasses} ${dynamicTransform}`;
}

describe("SiteHeader Smart Headroom Logic", () => {
  describe("Route Condition Check", () => {
    it("activates ONLY on article routes", () => {
      const result = resolveHeadroomState({
        pathname: "/article/quantum-computing-breakthrough",
        scrollY: 250,
        lastScrollY: 100,
      });
      expect(result.isHidden).toBe(true);

      const subRoute = resolveHeadroomState({
        pathname: "/article/2026/cybersecurity-threats",
        scrollY: 300,
        lastScrollY: 150,
      });
      expect(subRoute.isHidden).toBe(true);
    });

    it("remains normally visible (never hides) on homepage, category, or static pages", () => {
      // Home
      expect(
        resolveHeadroomState({
          pathname: "/",
          scrollY: 400,
          lastScrollY: 200,
        }).isHidden
      ).toBe(false);

      // Category
      expect(
        resolveHeadroomState({
          pathname: "/category/ai",
          scrollY: 500,
          lastScrollY: 100,
        }).isHidden
      ).toBe(false);

      // About / Static page
      expect(
        resolveHeadroomState({
          pathname: "/page/about",
          scrollY: 600,
          lastScrollY: 100,
        }).isHidden
      ).toBe(false);

      // Latest
      expect(
        resolveHeadroomState({
          pathname: "/latest",
          scrollY: 300,
          lastScrollY: 100,
        }).isHidden
      ).toBe(false);
    });
  });

  describe("Scroll Direction & Accumulated Intent Thresholds", () => {
    it("hides when scrolling down past 70px threshold with accumulated delta > 20px on article", () => {
      const step1 = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 80,
        lastScrollY: 70,
        currentState: false,
        accumulatedDelta: 0,
        lastDirection: null,
      });
      // diff is 10px -> delta is 10 (not yet > 20px)
      expect(step1.isHidden).toBe(false);

      const step2 = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 95,
        lastScrollY: 80,
        currentState: step1.isHidden,
        accumulatedDelta: step1.newAccumulatedDelta,
        lastDirection: step1.newDirection,
      });
      // diff is 15px -> total delta is 25px (> 20px) -> hides smoothly!
      expect(step2.isHidden).toBe(true);
    });

    it("drops back down when scrolling up with accumulated delta > 15px", () => {
      const result = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 200,
        lastScrollY: 220,
        currentState: true,
        accumulatedDelta: 0,
        lastDirection: "down",
      });
      // Scroll up by 20px (> 15px) -> reveals!
      expect(result.isHidden).toBe(false);
    });

    it("always shows header when near top of the page (<= 70px safe zone)", () => {
      const result = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 50,
        lastScrollY: 40,
        currentState: true,
      });
      expect(result.isHidden).toBe(false);
    });

    it("ignores micro-jitters without flipping states", () => {
      // User is reading at 300px and thumb wiggles down 5px then up 5px
      const wiggleDown = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 305,
        lastScrollY: 300,
        currentState: false,
        accumulatedDelta: 0,
        lastDirection: null,
      });
      expect(wiggleDown.isHidden).toBe(false);

      const wiggleUp = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 300,
        lastScrollY: 305,
        currentState: false,
        accumulatedDelta: wiggleDown.newAccumulatedDelta,
        lastDirection: wiggleDown.newDirection,
      });
      expect(wiggleUp.isHidden).toBe(false);
    });
  });

  describe("Responsive CSS Class Verification", () => {
    it("applies premium easing Tailwind classes and -translate-y-full on mobile when hidden, with md:translate-y-0", () => {
      const classes = getHeaderTailwindClasses({ isArticlePage: true, isHidden: true });
      expect(classes).toContain("transition-transform");
      expect(classes).toContain("duration-[400ms]");
      expect(classes).toContain("ease-[cubic-bezier(0.22,1,0.36,1)]");
      expect(classes).toContain("-translate-y-full");
      expect(classes).toContain("md:translate-y-0");
      expect(classes).toContain("md:sticky");
    });

    it("applies translate-y-0 when visible on article pages with custom easing", () => {
      const classes = getHeaderTailwindClasses({ isArticlePage: true, isHidden: false });
      expect(classes).toContain("duration-[400ms]");
      expect(classes).toContain("ease-[cubic-bezier(0.22,1,0.36,1)]");
      expect(classes).toContain("translate-y-0");
      expect(classes).not.toContain("-translate-y-full");
      expect(classes).toContain("md:translate-y-0");
    });

    it("applies normal translate-y-0 without hiding on non-article pages", () => {
      const homeClasses = getHeaderTailwindClasses({ isArticlePage: false, isHidden: true });
      expect(homeClasses).toContain("translate-y-0");
      expect(homeClasses).not.toContain("-translate-y-full");
    });
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Desktop article header contract (source-level)
 *
 * The behavioural helpers above model the older mobile headroom. The live
 * component must give article pages on desktop the exact homepage behaviour —
 * only the utility bar (Row 1) toggles — while the mobile 3-tier collapse
 * stays untouched below the breakpoint.
 * ───────────────────────────────────────────────────────────────────────────── */

describe("desktop article header (source contract)", () => {
  const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");
  const header = read("components/layout/SiteHeader.tsx");
  const css = read("app/globals.css");

  it("routes desktop article pages through the homepage Row 1 behaviour", () => {
    expect(header).toContain('window.matchMedia("(min-width: 768px)")');
    expect(header).toMatch(/if \(!isArticlePage \|\| isDesktop\)/);
    // Breakpoint crossings re-evaluate without waiting for a scroll.
    expect(header).toContain('window.addEventListener("resize", handleScroll)');
  });

  it("keeps the mobile progressive collapse for article pages below the breakpoint", () => {
    // The 3-tier thresholds still exist and still run for non-desktop
    // article pages (the branch after the desktop/listing return).
    expect(header).toContain("HIDE_ROW2_Y");
    expect(header).toContain("HIDE_ROW3_Y");
    expect(header.indexOf("if (!isArticlePage || isDesktop)")).toBeLessThan(
      header.indexOf("HIDE_ROW3_Y", header.indexOf("if (!isArticlePage || isDesktop)")),
    );
  });

  it("pins Rows 2 and 3 on desktop article pages but lets Row 1 collapse", () => {
    const desktopBlock = css.slice(css.indexOf('@media (min-width: 768px)'));
    const block = desktopBlock.slice(0, desktopBlock.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toContain('.site-head[data-article="true"] .hdr-row-2');
    expect(block).toContain('.site-head[data-article="true"] .hdr-row-3');
    expect(block).not.toContain('.site-head[data-article="true"] .hdr-row-1');
    expect(block).not.toMatch(/\.site-head\[data-article="true"\] \.hdr-row,/);
  });
});
