"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="icon-btn" aria-label="Toggle theme">
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const followingSystem = !theme || theme === "system";

  return (
    <button
      className="icon-btn"
      onClick={(event) => {
        // Manual override: store the explicit opposite of what is on screen.
        // Shift-click clears the override and resumes following the OS.
        if (event.shiftKey) {
          setTheme("system");
          return;
        }
        setTheme(isDark ? "light" : "dark");
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={
        followingSystem
          ? `Following your system theme (${isDark ? "dark" : "light"}) — click to switch to ${isDark ? "light" : "dark"}`
          : `Switch to ${isDark ? "light" : "dark"} theme (Shift-click to follow system)`
      }
    >
      {isDark ? (
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
    </button>
  );
}
