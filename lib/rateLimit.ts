/**
 * lib/rateLimit.ts
 *
 * IP/action-based rate limiter.
 *
 * Primary store is Redis (shared across every instance, so limits hold no
 * matter which replica a request lands on). If Redis is unreachable the
 * limiter falls back to a per-instance in-memory window — degraded, but auth
 * and comment flows keep working instead of failing open or closed.
 *
 * Usage:
 *   const result = await checkRateLimit("newsletter", ip, { limit: 3, windowMs: 10 * 60 * 1000 });
 *   if (!result.allowed) return { success: false, error: "Too many requests." };
 */

import redis from "./redis";

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis fixed window (atomic: INCR + PEXPIRE + PTTL in one round trip)
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_FIXED_WINDOW = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

async function checkRateLimitRedis(
  mapKey: string,
  options: RateLimitOptions,
  now: number,
): Promise<RateLimitResult> {
  const [count, ttl] = (await redis.eval(
    REDIS_FIXED_WINDOW,
    1,
    `rl:${mapKey}`,
    String(options.windowMs),
  )) as [number, number];

  const resetAt = now + (ttl > 0 ? ttl : options.windowMs);
  const allowed = count <= options.limit;
  return {
    allowed,
    remaining: Math.max(0, options.limit - count),
    resetAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory fallback (per instance) — used only when Redis is unavailable
// ─────────────────────────────────────────────────────────────────────────────

const rateLimitCache = new Map<string, RateLimitEntry>();

function checkRateLimitMemory(
  mapKey: string,
  options: RateLimitOptions,
  now: number,
): RateLimitResult {
  // Stochastic prune: 1% chance to clean expired tokens to prevent memory bloat
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitCache.entries()) {
      if (v.resetAt < now) {
        rateLimitCache.delete(k);
      }
    }
  }

  const entry = rateLimitCache.get(mapKey);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs;
    rateLimitCache.set(mapKey, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, options.limit - 1), resetAt };
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: Math.max(0, options.limit - entry.count), resetAt: entry.resetAt };
}

/**
 * Check and record a rate-limit hit for a given action + key (typically an IP).
 * Returns { allowed: true } when under the limit.
 */
export async function checkRateLimit(
  action: string,
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const mapKey = `${action}:${key}`;
  const now = Date.now();

  try {
    return await checkRateLimitRedis(mapKey, options, now);
  } catch (error) {
    console.error("[rateLimit] Redis unavailable, using in-memory fallback:", error);
    return checkRateLimitMemory(mapKey, options, now);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client IP resolution
// ─────────────────────────────────────────────────────────────────────────────

function isValidIp(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || value.includes(":");
}

/**
 * Extract the best available IP address from Next.js request headers.
 *
 * Trust order:
 *   1. CF-Connecting-IP — set by Cloudflare, which overwrites any client-
 *      supplied value, so it cannot be spoofed through the CDN.
 *   2. The rightmost X-Forwarded-For entry — appended by our own reverse
 *      proxy. The leftmost entry is client-controlled and trivially spoofed,
 *      so it is never trusted.
 */
export function getClientIp(headers: Headers): string {
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    const candidate = cfConnectingIp.trim();
    if (isValidIp(candidate)) return candidate;
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const candidate = parts[parts.length - 1];
    if (candidate && isValidIp(candidate)) return candidate;
  }

  return "unknown";
}
