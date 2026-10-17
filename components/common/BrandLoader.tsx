"use client";

// ─────────────────────────────────────────────────────────────────────────────
// xSypher industrial brand loader
// ─────────────────────────────────────────────────────────────────────────────
//
// Replaces generic spinners and blank loading states during console
// initialisation, admin route switches and authentication transitions.
//
// Built around the signature 4-boxes mark: three neutral,
// theme-adaptive squares and the crimson square carrying the X.
// The quadrants lock in with a staggered cyber-grid pulse and the
// signature square breathes a subtle crimson glow, over a frosted
// glass surface with a monospace telemetry line.
//
// `status` is the telemetry message ("INITIALIZING EDITORIAL
// CONSOLE...", "VERIFYING CREDENTIALS...", "SIGNING OUT...").
// ─────────────────────────────────────────────────────────────────────────────

interface BrandLoaderProps {
  /** Monospace telemetry line rendered under the mark. */
  status?: string;
  /**
   * "overlay" pins the loader to the viewport under a glassmorphic
   * scrim (route switches, auth actions). "inline" renders just the
   * mark and telemetry for slot-sized loading states.
   */
  mode?: "overlay" | "inline";
}

export default function BrandLoader({
  status = "INITIALIZING...",
  mode = "overlay",
}: BrandLoaderProps) {
  return (
    <div
      className={mode === "overlay" ? "brand-loader brand-loader-overlay" : "brand-loader"}
      role="status"
      aria-live="polite"
      aria-label={status}
    >
      <div className="brand-loader-grid" aria-hidden="true">
        {/* Cyber-grid backdrop the mark locks into. */}
        <span className="brand-loader-cybergrid" />
        <span className="brand-loader-cell brand-loader-cell-a" />
        <span className="brand-loader-cell brand-loader-cell-b" />
        <span className="brand-loader-cell brand-loader-cell-c" />
        <span className="brand-loader-cell brand-loader-cell-x">
          <svg viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M2 2l6 6M8 2l-6 6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
      <p className="brand-loader-telemetry">
        {status}
        <span className="brand-loader-cursor" aria-hidden="true" />
      </p>
    </div>
  );
}
