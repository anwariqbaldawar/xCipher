import redis from "@/lib/redis";
import { probeDatabase } from "@/lib/db-health";

// ─────────────────────────────────────────────────────────────────────────────
// Health check for uptime monitoring (UptimeRobot, BetterStack, …).
//
//   GET /api/health → 200 { status: "ok", checks: { database, redis } }
//                 → 503 { status: "degraded", … } when a dependency is down
//
// Deliberately unauthenticated and detail-light: it exposes component
// statuses and latencies only, never connection strings or data.
//
// The database check runs through a wake-up budget (lib/db-health.ts): a
// successful probe is reused for HEALTH_DB_PROBE_MS (5 minutes by default,
// matching Neon's scale-to-zero window) so a monitor polling every 30 seconds
// cannot hold the compute awake, while a failure is always reported immediately
// and re-probed. `cached: true` on the check marks an answer that came from the
// budget rather than a live query.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

async function checkRedis(): Promise<{ status: "ok" | "fail"; latencyMs: number }> {
  const start = Date.now();
  try {
    // ioredis queues commands while disconnected and never rejects them, so
    // bound the wait explicitly — a down Redis must report "fail", not hang.
    const pong = await Promise.race([
      redis.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2000),
      ),
    ]);
    return {
      status: pong === "PONG" ? "ok" : "fail",
      latencyMs: Date.now() - start,
    };
  } catch {
    return { status: "fail", latencyMs: -1 };
  }
}

export async function GET() {
  // Redis is a local/cheap dependency (and the view-counter buffer), so its
  // check stays live — only the Postgres probe is budgeted.
  const [database, redisCheck] = await Promise.all([probeDatabase(), checkRedis()]);
  const checks = { database, redis: redisCheck };
  const ok = database.status === "ok" && redisCheck.status === "ok";

  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks,
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
