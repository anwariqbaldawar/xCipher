// ─────────────────────────────────────────────────────────────────────────────
// Article deletion: assets, caches and index notifications
// ─────────────────────────────────────────────────────────────────────────────
//
// Deleting an article is four jobs, and the pipeline used to do two of them
// partially and in three different ways depending on which button was pressed:
//
//   1. remove the R2 objects   — the content blob, the featured image, the
//                                social image and every inline image
//   2. remove the database row — and its relations (cascade handles tags,
//                                comments, reviews, revisions)
//   3. drop the caches         — route + data caches for every public surface
//                                that listed the article
//   4. tell the index          — the Google Indexing API, for a URL that was
//                                published and is now gone
//
// `archiveArticle` and friends already invalidate through
// `articleMutationTags`, but the delete path only ever revalidated three paths
// and never a tag, so /latest, category pages, author pages, tag pages and the
// feed kept serving the story until their own revalidate window expired -- up
// to ten minutes for an author page, and indefinitely on an edge that had
// already cached the HTML.
//
// One helper per job, used by every delete path (permanent delete, own-draft
// delete, bulk delete) and by the offline cleanup script, so the three cannot
// drift apart again.

import { collectArticleAssetKeys, isArticleAssetKey, type ArticleContentPayload } from "./article-assets";
import { articleMutationTags } from "./cache-tags";
import { revalidatePath, revalidateTag } from "./revalidate";
import { registerDeletedSlug } from "./tombstones";
import { siteConfig } from "./seo";
import { deleteKeysFromR2, getR2Config, r2KeyFromUrl } from "./storage";

export interface DeletableArticle {
  id: string;
  slug: string;
  title?: string | null;
  img?: string | null;
  ogImage?: string | null;
  contentUrl?: string | null;
  publishedAt?: Date | string | null;
  category?: { slug?: string | null } | null;
  authorModel?: { slug?: string | null } | null;
  tagSlugs?: string[];
}

export interface AssetPurgeReport {
  /** Keys found across the content blob, the featured/social image and inline media. */
  keys: string[];
  deleted: string[];
  failed: { key: string; error: string }[];
  /** Public URLs that were asked to evict from the edge cache. */
  purgedUrls: string[];
  /** Set when the payload could not be read, so keys may be incomplete. */
  note?: string;
}

export interface PurgeAssetsOptions {
  /**
   * Extra stored references to include in the purge.
   *
   * Used for the content keys called out by `ArticleRevision` rows: those are
   * normally the same `articles/content-<id>.json` object the article itself
   * points at, but a restore or a legacy save can leave a revision holding a key
   * the article no longer references, and that object would otherwise outlive
   * the row that is its only record.
   */
  extraReferences?: readonly (string | null | undefined)[];
  /** Suppress the console warning when the content payload cannot be read. */
  quiet?: boolean;
}

/**
 * Content payload for a deletion, read through the network rather than the
 * Next data cache.
 *
 * `fetchFromR2` is cached for 300s, which is right for rendering and wrong
 * here: an image added in the last five minutes would be invisible to the
 * scan and left in the bucket. Deletion is rare, so it pays for the fresh read.
 */
async function fetchContentForDeletion(contentUrl: string): Promise<ArticleContentPayload | string | null> {
  const config = getR2Config();
  if ("error" in config) return null;

  const url = /^https?:\/\//i.test(contentUrl)
    ? contentUrl
    : `${config.publicBase}/${contentUrl.replace(/^\/+/, "")}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as ArticleContentPayload;
    }
    return await res.text();
  } catch (error) {
    console.warn("[article-deletion] Could not read content payload:", error);
    return null;
  }
}

/**
 * Delete every R2 object an article owns.
 *
 * The database row is untouched: callers run this *before* the delete so the
 * references still exist to be read. A storage failure is reported rather than
 * thrown, because losing a file is not a reason to refuse to remove a test post
 * — the cleanup script will find the leftovers by listing the bucket.
 */
export async function purgeArticleAssets(
  article: DeletableArticle,
  options: PurgeAssetsOptions = {},
): Promise<AssetPurgeReport> {
  const config = getR2Config();
  if ("error" in config) {
    return { keys: [], deleted: [], failed: [], purgedUrls: [], note: config.error };
  }

  const payload = article.contentUrl ? await fetchContentForDeletion(article.contentUrl) : null;
  const keys = new Set(collectArticleAssetKeys(article, payload));

  // Anything the caller knows about but the columns and the body do not name —
  // legacy revision content keys, above all.
  for (const reference of options.extraReferences ?? []) {
    const key = r2KeyFromUrl(reference ?? null);
    if (key && isArticleAssetKey(key)) keys.add(key);
  }

  const requested = [...keys];
  const result = requested.length
    ? await deleteKeysFromR2(requested)
    : { deleted: [] as string[], failed: [] as { key: string; error: string }[] };

  const purgedUrls = await purgeEdgeCache(
    result.deleted.map((key) => `${config.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`),
  );

  if (article.contentUrl && !payload) {
    if (!options.quiet) {
      console.warn(
        `[article-deletion] content payload unreadable for ${article.slug} — inline images could not be enumerated`,
      );
    }
    return {
      keys: requested,
      deleted: result.deleted,
      failed: result.failed,
      purgedUrls,
      note: "content payload unreadable — inline images could not be enumerated (the sweep script can find them by listing the bucket)",
    };
  }

  return { keys: requested, deleted: result.deleted, failed: result.failed, purgedUrls };
}

/**
 * Evict absolute URLs from the edge cache.
 *
 * Deleting an object from R2 does not delete it from the CDN in front of the
 * bucket, and revalidating a Next.js route does not delete the HTML Cloudflare
 * is holding either. Without a purge, "the file is gone" and "the page 404s"
 * are both only true at the origin: a crawler asking the edge can still be
 * served the deleted image — or the deleted article — for as long as the cached
 * response lives. That is the whole reason the ghost content outlived the
 * delete in the first place.
 *
 * Two mechanisms, both best-effort:
 *
 *   1. the Cache API, which covers the common case where the media host is a
 *      custom domain on the same zone as the Worker — and also works for the
 *      site's own HTML when it is served from the same zone;
 *   2. the Cloudflare purge API, for a host on a different zone, when a token
 *      with the `cache purge` permission is configured (`CLOUDFLARE_ZONE_ID` +
 *      `CLOUDFLARE_PURGE_API_TOKEN`).
 *
 * Neither is allowed to fail a deletion: a stale edge copy is a temporary
 * problem, an undeleted row is not.
 */
export async function purgeEdgeCache(urls: readonly string[]): Promise<string[]> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return [];

  try {
    const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (cache?.delete) {
      await Promise.all(unique.map((url) => cache.delete(url).catch(() => false)));
    }
  } catch (error) {
    console.warn("[article-deletion] Cache API purge skipped:", error);
  }

  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_PURGE_API_TOKEN;
  if (zoneId && token) {
    // The purge endpoint accepts at most 30 files per request.
    for (let i = 0; i < unique.length; i += 30) {
      const batch = unique.slice(i, i + 30);
      try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ files: batch }),
        });
        if (!res.ok) {
          console.warn(`[article-deletion] Cloudflare purge failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
        }
      } catch (error) {
        console.warn("[article-deletion] Cloudflare purge threw:", error);
      }
    }
  }

  return unique;
}

/**
 * The syndication and index surfaces that list an article by path only.
 *
 * Everything else a story appears on is reached through a cache tag
 * (`articleMutationTags`), so invalidating the tag is enough. These files are
 * route handlers cached with their own `revalidate` window -- 3600s for
 * `/feed.xml` and `/sitemap/pages.xml` -- and they read the article table
 * directly. Without an explicit path invalidation an archived story stays in
 * the feed and the sitemap for up to an hour, which is exactly what keeps a
 * dead URL in a search index.
 *
 * Kept here, and shared with the status-change path in `app/actions/workflow.ts`,
 * so publish/unpublish and delete cannot disagree about which surfaces exist.
 * `rss.xml` is listed next to the feed that does exist (`feed.xml`) as cheap
 * insurance against a future route rename.
 */
export const SYNDICATION_PATHS = [
  "/feed.xml",
  "/rss.xml",
  "/sitemap.xml",
  "/sitemap/pages.xml",
  "/sitemap/articles.xml",
] as const;

/**
 * What a deletion path list needs to know: the article's slug, plus the
 * archives it was listed on. Deliberately looser than `DeletableArticle` so the
 * status-change path can build the same list from the transition's article
 * shape instead of inventing an `id` it has no use for.
 */
export type DeletionPathArticle = Pick<DeletableArticle, "slug" | "category" | "authorModel" | "tagSlugs">;

/**
 * Every public path that can still be showing an article that is now gone.
 *
 * Exported and pure so the set can be asserted in a test: a missing entry here
 * is invisible until a crawler finds the story again on an archive page, which
 * is exactly the bug this module exists to fix.
 */
export function deletionPaths(article: DeletionPathArticle): string[] {
  const paths = new Set<string>([
    "/",
    "/latest",
    "/search",
    `/article/${article.slug}`,
    ...SYNDICATION_PATHS,
  ]);
  if (article.category?.slug) paths.add(`/category/${article.category.slug}`);
  if (article.authorModel?.slug) paths.add(`/author/${article.authorModel.slug}`);
  for (const tagSlug of article.tagSlugs ?? []) paths.add(`/tag/${tagSlug}`);
  return [...paths];
}

/**
 * Invalidate every cached surface that could still show this article.
 *
 * Tags first: the listings (homepage, /latest, category, tag, author, related
 * stories) are `unstable_cache` entries, and those are only cleared by
 * `revalidateTag`. Paths second, for the routes that read the article directly
 * and for the sitemap/feed documents. Revalidating a path that was never cached
 * costs nothing.
 */
export async function revalidateArticleDeletion(article: DeletableArticle): Promise<void> {
  // Tombstone the slug first: every delete path (permanent, own-draft,
  // bulk) and the offline ghost sweep funnels through here, so this is
  // the one place a deletion becomes visible to the edge. From this
  // moment the URL answers 410 Gone instead of 404, and a slug that
  // is later reused for a new article is un-tombstoned by the upsert
  // path (forgetDeletedSlug) rather than by time.
  await registerDeletedSlug(article.slug, article.title);

  const tags = articleMutationTags({
    slug: article.slug,
    category: article.category,
    authorModel: article.authorModel,
    tagSlugs: article.tagSlugs,
  });
  for (const tag of tags) {
    await revalidateTag(tag, "max");
  }

  const paths = deletionPaths(article);
  for (const path of paths) {
    await revalidatePath(path);
  }

  // Next's revalidation drops the Worker's own caches. The edge in front of it
  // is a second cache with its own TTL, and the article route is served with
  // `s-maxage` — so a deleted slug can keep answering 200 from the CDN after the
  // origin has started returning 404. Purge the HTML URLs too, not just the R2
  // media that purgeArticleAssets() already evicted.
  const origin = siteConfig.url.replace(/\/+$/, "");
  await purgeEdgeCache(paths.map((path) => `${origin}${path === "/" ? "/" : path}`));
}

/**
 * Ask Google to drop a URL that was published and is now gone.
 *
 * Only for articles that were actually live — telling the Indexing API about a
 * draft URL that never existed is a request Google ignores at best. Never
 * throws: an indexing failure must not roll back a deletion the editor asked
 * for.
 */
export async function notifyIndexingOfDeletion(article: DeletableArticle): Promise<void> {
  if (!article.publishedAt) return;
  try {
    // Imported here rather than at the top of the file: lib/google-indexing
    // pulls in the BullMQ queue, which opens a Redis connection the moment it is
    // imported. The offline cleanup script uses this module's asset purge and
    // has no business dialling Redis (or telling Google anything) to do it.
    const { enqueueGoogleIndexing } = await import("./google-indexing");
    await enqueueGoogleIndexing(article.slug, "URL_DELETED");
  } catch (error) {
    console.warn("[article-deletion] Indexing notification failed:", error);
  }
}
