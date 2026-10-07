/**
 * lib/rateLimit.ts
 *
 * Lightweight in-memory, IP-based rate limiter.
 * Works per-serverless-function instance; does not share state across replicas.
 * Suitable for Next.js on Vercel/Supabase without Redis.
 *
 * Usage:
 *   const result = checkRateLimit("newsletter", ip, { limit: 3, windowMs: 10 * 60 * 1000 });
 *   if (!result.allowed) return { success: false, error: "Too many requests." };
 */

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

const rateLimitCache = new Map<string, RateLimitEntry>();

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
 * Extract the best available IP address from Next.js request headers.
 * Reads x-forwarded-for (set by Vercel/proxies) with a fallback to a constant.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
