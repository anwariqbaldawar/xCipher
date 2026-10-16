import "server-only";

import { sql } from "drizzle-orm";
import { db } from "./db";

// ─────────────────────────────────────────────────────────────────────────────
// Database reachability, rate-limited to a wake-up budget
// ─────────────────────────────────────────────────────────────────────────────
//
// `/api/health` answered with `SELECT 1` on every request, which made the
// monitoring system the single most reliable way to keep Neon awake. Almost every
// uptime service is configured to poll somewhere between every 30 seconds and
// every 5 minutes, and Neon suspends a compute after ~5 minutes idle — so a
// healthy site watched by a pinger never suspended at all. That is the worst
// possible shape for this metric: the check that is supposed to prove the site is
// up was the reason the bill was high.
//
// The fix is a budget, not a removal. A successful probe is reused for
// `HEALTH_DB_PROBE_MS` (default 5 minutes — the same window Neon uses before it
// suspends), so one ping every 30 seconds produces one query every 5 minutes
// while still reporting the truth. Two properties are kept deliberately:
//
//   • FAILURES ARE NEVER CACHED. A degraded database is reported immediately, and
//     the next request probes again, so an incident is not hidden behind a stale
//     "ok" for the length of the window.
//   • The first request after a cold start always probes. There is no warm-up
//     surprise where the endpoint claims healthy from a value it never measured.
// ─────────────────────────────────────────────────────────────────────────────

export interface DatabaseProbeResult {
  status: "ok" | "fail";
  latencyMs: number;
  /** True when this answer came from the budget rather than a live query. */
  cached?: boolean;
}

const DEFAULT_PROBE_INTERVAL_MS = 300_000;

let lastSuccess: { at: number; result: DatabaseProbeResult } | null = null;

/** How long a successful probe may be reused. `0` disables the budget. */
export function healthProbeIntervalMs(): number {
  const raw = process.env.HEALTH_DB_PROBE_MS;
  if (raw === undefined || raw === "") return DEFAULT_PROBE_INTERVAL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_PROBE_INTERVAL_MS;
  return parsed;
}

/**
 * Whether a probe may run now.
 *
 * Pure and exported so the budget is testable without a database: the caller
 * passes the clock.
 */
export function shouldProbeDatabase(
  lastProbeAt: number | null,
  now: number = Date.now(),
  intervalMs: number = healthProbeIntervalMs(),
): boolean {
  if (intervalMs <= 0) return true;
  if (lastProbeAt === null) return true;
  return now - lastProbeAt >= intervalMs;
}

/** Test/ops seam: forget the cached probe so the next call queries for real. */
export function resetDatabaseProbe(): void {
  lastSuccess = null;
}

/**
 * The health endpoint's database check.
 *
 * Returns the last success inside the budget without touching Neon, and runs a
 * real query otherwise. Never throws: a failure is a result, not an error.
 */
export async function probeDatabase(now: number = Date.now()): Promise<DatabaseProbeResult> {
  if (lastSuccess && !shouldProbeDatabase(lastSuccess.at, now)) {
    return { ...lastSuccess.result, cached: true };
  }

  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const result: DatabaseProbeResult = { status: "ok", latencyMs: Date.now() - start };
    lastSuccess = { at: now, result };
    return result;
  } catch {
    // Not cached — see the note at the top of the file.
    lastSuccess = null;
    return { status: "fail", latencyMs: -1 };
  }
}
