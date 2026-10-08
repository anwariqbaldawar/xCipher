import { db } from "@/lib/db";
import redis from "@/lib/redis";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Health check for uptime monitoring (UptimeRobot, BetterStack, …).
//
//   GET /api/health → 200 { status: "ok", checks: { database, redis } }
//                 → 503 { status: "degraded", … } when a dependency is down
//
// Deliberately unauthenticated and detail-light: it exposes component
// statuses and latencies only, never connection strings or data.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<{ status: "ok" | "fail"; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "fail", latencyMs: -1 };
  }
}

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
  const [database, redisCheck] = await Promise.all([checkDatabase(), checkRedis()]);
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
