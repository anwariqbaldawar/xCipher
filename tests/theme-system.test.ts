import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// System-aware theme contract (source-level: jsdom has no real
// prefers-color-scheme pipeline or pre-paint script execution).
//
// First visit / no saved override → follow the OS on mobile and desktop,
// including live OS changes. A manual header toggle stores an explicit
// choice that wins over the OS. next-themes' inline script resolves the
// theme before first paint, which is what prevents FOUC.
// ─────────────────────────────────────────────────────────────────────────────

const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");

describe("system-aware theme synchronisation", () => {
  it("defaults to the OS theme with the system listener enabled", () => {
    const provider = read("components/layout/ThemeProvider.tsx");
    expect(provider).toContain('defaultTheme="system"');
    expect(provider).toContain("enableSystem");
    expect(provider).toContain('attribute="data-theme"');
    expect(provider).toContain('storageKey="xsypher-theme"');

    const layout = read("app/layout.tsx");
    expect(layout).toContain('defaultTheme="system"');
    expect(layout).toContain("enableSystem");
  });

  it("keeps the manual toggle as an explicit override with a way back to system", () => {
    const toggle = read("components/layout/ThemeToggle.tsx");
    // The toggle stores the opposite of the resolved (on-screen) theme…
    expect(toggle).toContain('setTheme(isDark ? "light" : "dark")');
    // …and Shift-click clears the override so the OS listener resumes.
    expect(toggle).toContain('setTheme("system")');
    // It renders from resolvedTheme, so following the OS and holding an
    // override show the same correct icon.
    expect(toggle).toContain("resolvedTheme");
  });
});
