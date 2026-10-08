import redis from "./redis";
import { db } from "./db";
import { article } from "./db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Article view buffering.
//
// incrementArticleView used to run one UPDATE per page view — over the Neon
// HTTP driver that is one full round trip to Postgres per view, which is the
// single most expensive thing a public page does. Instead, views are counted
// in Redis (INCR, sub-millisecond) and this module flushes the buffered deltas
// to Postgres once a minute from the worker (job: flushArticleViews).
//
// Keys:
//   views:article:{id}  — buffered, not-yet-flushed view count for the article
//   views:pending       — Redis set of article ids with buffered views
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_KEY = "views:pending";
const FLUSH_BATCH = 500;

/** Buffers one view for an article in Redis. Returns false when Redis is
 *  unavailable so the caller can fall back to a direct database update. */
export async function bufferArticleView(id: string): Promise<boolean> {
  if (redis.status !== "ready") return false;
  try {
    const key = `views:article:${id}`;
    await redis
      .pipeline()
      .incr(key)
      .sadd(PENDING_KEY, id)
      .expire(key, 7 * 24 * 3600)
      .exec();
    return true;
  } catch (error) {
    console.error("[views] Failed to buffer view in Redis:", error);
    return false;
  }
}

/** Flushes buffered view counts to Postgres. Safe to call concurrently and
 *  repeatedly; uses GETDEL so a view counted mid-flush is never lost. */
export async function flushArticleViews(): Promise<number> {
  if (redis.status !== "ready") return 0;

  const ids = await redis.smembers(PENDING_KEY);
  if (ids.length === 0) return 0;

  let flushed = 0;
  for (let i = 0; i < ids.length; i += FLUSH_BATCH) {
    const batch = ids.slice(i, i + FLUSH_BATCH);
    for (const id of batch) {
      try {
        // GETDEL atomically reads and removes the counter, so a view counted
        // between the read and the removal simply starts a fresh counter that
        // the next flush picks up.
        const raw = await redis.getdel(`views:article:${id}`);
        const delta = Number(raw || 0);
        if (delta > 0) {
          await db
            .update(article)
            .set({ views: sql`${article.views} + ${delta}` })
            .where(eq(article.id, id));
          flushed++;
        }
      } catch (error) {
        console.error(`[views] Failed to flush views for article ${id}:`, error);
      } finally {
        await redis.srem(PENDING_KEY, id).catch(() => undefined);
      }
    }
  }
  return flushed;
}
