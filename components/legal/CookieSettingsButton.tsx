"use client";

import { Cookie } from "lucide-react";
import { resetCookiePreference, useCookiePreference } from "@/components/common/CookieConsent";

/**
 * Re-opens the cookie banner so a reader can change or withdraw consent at
 * any time. Choosing Decline after an earlier Accept stops ads from loading on
 * later page views; cookies Google already set expire on their own schedule or
 * can be cleared in the browser (the Cookie Policy says so).
 */
export default function CookieSettingsButton() {
  const preference = useCookiePreference();
  const label = preference === "accepted" ? "Optional cookies: allowed" : preference === "declined" ? "Optional cookies: declined" : "Choose in the banner below";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={resetCookiePreference}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <Cookie className="h-4 w-4" aria-hidden="true" />
        Cookie settings
      </button>
      <span className="text-sm text-[var(--muted)]" aria-live="polite">{label}</span>
    </div>
  );
}
