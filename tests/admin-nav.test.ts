import { describe, it, expect } from "vitest";
import { isConsoleRouteActive } from "@/lib/admin-route";

describe("isConsoleRouteActive", () => {
  describe("Desktop Apex routes (/admin/*)", () => {
    it("activates only Home/Dashboard when on /admin", () => {
      expect(isConsoleRouteActive("/admin", "/admin")).toBe(true);
      expect(isConsoleRouteActive("/admin", "/admin/articles")).toBe(false);
      expect(isConsoleRouteActive("/admin", "/admin/settings")).toBe(false);
      expect(isConsoleRouteActive("/admin", "/admin/media")).toBe(false);
    });

    it("activates only Articles when on /admin/articles (Dashboard is strictly inactive)", () => {
      expect(isConsoleRouteActive("/admin/articles", "/admin")).toBe(false);
      expect(isConsoleRouteActive("/admin/articles", "/admin/articles")).toBe(true);
      expect(isConsoleRouteActive("/admin/articles", "/admin/settings")).toBe(false);
    });

    it("activates only Settings when on /admin/settings (Dashboard is strictly inactive)", () => {
      expect(isConsoleRouteActive("/admin/settings", "/admin")).toBe(false);
      expect(isConsoleRouteActive("/admin/settings", "/admin/articles")).toBe(false);
      expect(isConsoleRouteActive("/admin/settings", "/admin/settings")).toBe(true);
    });

    it("handles query parameters on /admin/settings?tab=profile&edit=true", () => {
      expect(isConsoleRouteActive("/admin/settings?tab=profile&edit=true", "/admin")).toBe(false);
      expect(isConsoleRouteActive("/admin/settings?tab=profile&edit=true", "/admin/settings")).toBe(true);
      expect(isConsoleRouteActive("/admin/settings?tab=profile&edit=true", "/admin/articles")).toBe(false);
    });

    it("activates Review Queue when status=SUBMITTED and deactivates general Articles link", () => {
      expect(isConsoleRouteActive("/admin/articles", "/admin", { isReviewQueue: true })).toBe(false);
      expect(isConsoleRouteActive("/admin/articles", "/admin/articles", { isReviewQueue: true })).toBe(false);
      expect(isConsoleRouteActive("/admin/articles", "/admin/articles?status=SUBMITTED", { isReviewQueue: true })).toBe(true);
    });

    it("activates Editor for /admin/editor/[id]", () => {
      expect(isConsoleRouteActive("/admin/editor/abc-123", "/admin")).toBe(false);
      expect(isConsoleRouteActive("/admin/editor/abc-123", "/admin/editor")).toBe(true);
      expect(isConsoleRouteActive("/admin/editor/abc-123", "/admin/settings")).toBe(false);
    });
  });

  describe("Subdomain routes (admin.xsypher.com/*)", () => {
    it("activates only Home/Dashboard when on root /", () => {
      expect(isConsoleRouteActive("/", "/admin")).toBe(true);
      expect(isConsoleRouteActive("/", "/admin/articles")).toBe(false);
      expect(isConsoleRouteActive("/", "/admin/settings")).toBe(false);
    });

    it("activates only Articles when on /articles", () => {
      expect(isConsoleRouteActive("/articles", "/admin")).toBe(false);
      expect(isConsoleRouteActive("/articles", "/admin/articles")).toBe(true);
      expect(isConsoleRouteActive("/articles", "/admin/settings")).toBe(false);
    });

    it("activates only Settings when on /settings", () => {
      expect(isConsoleRouteActive("/settings", "/admin")).toBe(false);
      expect(isConsoleRouteActive("/settings", "/admin/articles")).toBe(false);
      expect(isConsoleRouteActive("/settings", "/admin/settings")).toBe(true);
    });
  });

  describe("Mutual exclusivity in mobile bottom nav", () => {
    const tabs = [
      { href: "/admin", label: "Home" },
      { href: "/admin/articles", label: "Articles" },
      { href: "/admin/media", label: "Media" },
      { href: "/admin/settings", label: "Settings" },
    ];

    const getActiveTabs = (pathname: string, writing: boolean = false) => {
      return tabs.filter(t => isConsoleRouteActive(pathname, t.href, { isWriting: writing })).map(t => t.label);
    };

    it("has only Home active on /admin", () => {
      expect(getActiveTabs("/admin")).toEqual(["Home"]);
    });

    it("has only Articles active on /admin/articles", () => {
      expect(getActiveTabs("/admin/articles")).toEqual(["Articles"]);
    });

    it("has only Media active on /admin/media", () => {
      expect(getActiveTabs("/admin/media")).toEqual(["Media"]);
    });

    it("has only Settings active on /admin/settings", () => {
      expect(getActiveTabs("/admin/settings")).toEqual(["Settings"]);
    });

    it("has only Settings active on /admin/settings?tab=profile&edit=true", () => {
      expect(getActiveTabs("/admin/settings?tab=profile&edit=true")).toEqual(["Settings"]);
    });

    it("has only Articles active in writing mode (/admin/editor/123)", () => {
      expect(getActiveTabs("/admin/editor/123", true)).toEqual(["Articles"]);
    });
  });
});
