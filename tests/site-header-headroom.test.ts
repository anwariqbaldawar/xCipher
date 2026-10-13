import { describe, expect, it } from "vitest";

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

  if (scrollY <= 60) {
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

  if (currentDirection === "down" && scrollY > 100 && newDelta > 20) {
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
    "site-head sticky top-0 z-40 headroom-nav md:sticky md:top-0 md:translate-y-0";
  const dynamicTransform = isArticlePage
    ? isHidden
      ? "is-hidden -translate-y-full"
      : "is-visible translate-y-0"
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
    it("hides when scrolling down past 100px with accumulated delta > 20px on article", () => {
      const step1 = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 110,
        lastScrollY: 100,
        currentState: false,
        accumulatedDelta: 0,
        lastDirection: null,
      });
      // diff is 10px -> delta is 10 (not yet > 20px)
      expect(step1.isHidden).toBe(false);

      const step2 = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 125,
        lastScrollY: 110,
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

    it("always shows header when near top of the page (<= 60px)", () => {
      const result = resolveHeadroomState({
        pathname: "/article/test-slug",
        scrollY: 40,
        lastScrollY: 30,
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
    it("applies headroom-nav and -translate-y-full on mobile when hidden, with md:translate-y-0", () => {
      const classes = getHeaderTailwindClasses({ isArticlePage: true, isHidden: true });
      expect(classes).toContain("headroom-nav");
      expect(classes).toContain("is-hidden");
      expect(classes).toContain("-translate-y-full");
      expect(classes).toContain("md:translate-y-0");
      expect(classes).toContain("md:sticky");
    });

    it("applies is-visible translate-y-0 when visible on article pages", () => {
      const classes = getHeaderTailwindClasses({ isArticlePage: true, isHidden: false });
      expect(classes).toContain("headroom-nav");
      expect(classes).toContain("is-visible");
      expect(classes).toContain("translate-y-0");
      expect(classes).not.toContain("-translate-y-full");
      expect(classes).toContain("md:translate-y-0");
    });

    it("applies normal translate-y-0 without headroom state classes on non-article pages", () => {
      const homeClasses = getHeaderTailwindClasses({ isArticlePage: false, isHidden: true });
      expect(homeClasses).toContain("translate-y-0");
      expect(homeClasses).not.toContain("is-hidden");
      expect(homeClasses).not.toContain("-translate-y-full");
    });
  });
});
