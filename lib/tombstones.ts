// ─────────────────────────────────────────────────────────────────────────────
// Tombstones: the server half of the deleted-slug registry
// ─────────────────────────────────────────────────────────────────────────────
//
// lib/deleted-slugs.ts holds the compiled-in half of the registry —
// slugs known to be gone at build time, which the middleware can match
// with zero I/O. This module is the other half: slugs that were deleted
// from the dashboard at runtime.
//
// Writes come from the deletion pipeline (lib/article-deletion.ts
// `revalidateArticleDeletion`, which every delete path — permanent,
// own-draft and bulk — already funnels through), so a slug is
// tombstoned the moment its row disappears. Reads are served through
// unstable_cache tagged `deleted-slugs`, the same Zero-DB-Wakeup
// pattern the rest of the publication uses: the tombstone table is
// queried at most once per cache window, and every article page view
// between windows answers from the cache instead of waking Neon.
//
// The edge never imports this file (it pulls in the database driver);
// it consumes the registry through the cached manifest endpoint in
// app/api/deleted-slugs/route.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { unstable_cache } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { article, deletedArticleSlug } from "@/lib/db/schema";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { revalidateTag } from "@/lib/revalidate";
import { KNOWN_DELETED_SLUGS, isDeletedSlug } from "./deleted-slugs";

/**
 * The cached half of the registry: every tombstone row in the
 * table, minus any slug a live article has taken back.
 *
 * The filter is what makes a stale tombstone harmless. A slug
 * is not unique forever — getUniqueSlug only checks live rows,
 * so a new story can be created with (or manually given) a
 * slug a deleted fixture used to own. The tombstone row may
 * still be sitting in the table when that happens, and the
 * cached manifest may still name it, but a slug that belongs
 * to a live article is not gone, so it is not reported as
 * gone. The check runs inside the same unstable_cache entry,
 * so it costs one query per cache window, not per request.
 */
const getTombstonedSlugs = unstable_cache(
  async () => {
    const rows = await db.select({ slug: deletedArticleSlug.slug }).from(deletedArticleSlug);
    if (rows.length === 0) return [];

    const tombstones = rows.map((row) => row.slug);
    const live = await db
      .select({ slug: article.slug })
      .from(article)
      .where(inArray(article.slug, tombstones));
    const liveSlugs = new Set(live.map((row) => row.slug));
    return tombstones.filter((slug) => !liveSlugs.has(slug));
  },
  ["deleted-article-slugs-v1"],
  { tags: [CACHE_TAGS.deletedSlugs], revalidate: 3600 },
);

/**
 * The full registry: compiled-in tombstones plus every slug deleted
 * from the dashboard since the last deploy.
 */
export async function getDeletedSlugs(): Promise<string[]> {
  const dynamic = await getTombstonedSlugs();
  return [...new Set([...KNOWN_DELETED_SLUGS, ...dynamic])];
}

/**
 * Is this slug permanently gone?
 *
 * The static check runs first so the common cases — a fixture slug, a
 * slug already in the compiled-in list — answer without touching the
 * cache or the database at all.
 */
export async function isTombstonedSlug(slug: string): Promise<boolean> {
  if (isDeletedSlug(slug)) return true;
  const normalized = slug.trim().toLowerCase();
  const dynamic = await getTombstonedSlugs();
  return dynamic.includes(normalized);
}

/**
 * Tombstone a slug.
 *
 * Called by the deletion pipeline the moment an article's row is
 * removed, so crawlers asking for the URL start getting 410 instead
 * of retrying a 404. Idempotent: re-deleting an article (the offline
 * ghost sweep can run after the dashboard already deleted it) is a
 * no-op, and a failure here must never roll back the deletion itself,
 * so errors are logged and swallowed.
 */
export async function registerDeletedSlug(
  slug: string,
  title?: string | null,
): Promise<void> {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return;
  try {
    await db
      .insert(deletedArticleSlug)
      .values({ slug: normalized, title: title?.trim() || null, deletedAt: new Date() })
      .onConflictDoNothing({ target: deletedArticleSlug.slug });
    await revalidateTag(CACHE_TAGS.deletedSlugs, "max");
  } catch (error) {
    // The article row is already gone; the tombstone only sharpens the
    // response the URL gives. A failed tombstone costs a 404 instead of
    // a 410 until the next deploy rebuilds the static half — it must not
    // fail the delete the editor asked for.
    console.warn(`[tombstones] could not tombstone slug ${normalized}:`, error);
  }
}

/**
 * Remove a tombstone row.
 *
 * Slugs are not unique forever: a new article can be created with a
 * slug a deleted fixture used to own (getUniqueSlug only checks live
 * article rows). Called from the article upsert path whenever a slug
 * is (re)assigned, so the tombstone table does not grow forever.
 *
 * Deliberately does NOT revalidate the `deleted-slugs` cache tag:
 * the upsert path (including autosave, which runs constantly) must
 * never drop cache tags — the save-path invariant the anonymity
 * tests pin down. Correctness does not need it either, because
 * getTombstonedSlugs filters tombstones against live article rows,
 * so a reused slug stops answering 410 on the next cache read
 * even while this row is still being cleared.
 */
export async function forgetDeletedSlug(slug: string): Promise<void> {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return;
  try {
    await db.delete(deletedArticleSlug).where(eq(deletedArticleSlug.slug, normalized));
  } catch (error) {
    console.warn(`[tombstones] could not clear tombstone for ${normalized}:`, error);
  }
}
