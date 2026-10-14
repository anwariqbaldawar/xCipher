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

import { collectArticleAssetKeys, type ArticleContentPayload } from "./article-assets";
import { articleMutationTags } from "./cache-tags";
import { enqueueGoogleIndexing } from "./google-indexing";
import { revalidatePath, revalidateTag } from "./revalidate";
import { deleteKeysFromR2, getR2Config } from "./storage";

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
export async function purgeArticleAssets(article: DeletableArticle): Promise<AssetPurgeReport> {
  const config = getR2Config();
  if ("error" in config) {
    return { keys: [], deleted: [], failed: [], purgedUrls: [], note: config.error };
  }

  const payload = article.contentUrl ? await fetchContentForDeletion(article.contentUrl) : null;
  const keys = collectArticleAssetKeys(article, payload);

  const result = keys.length
    ? await deleteKeysFromR2(keys)
    : { deleted: [] as string[], failed: [] as { key: string; error: string }[] };

  const purgedUrls = await purgeEdgeCache(config.publicBase, result.deleted);

  if (article.contentUrl && !payload) {
    return {
      keys,
      deleted: result.deleted,
      failed: result.failed,
      purgedUrls,
      note: "content payload unreadable — inline images could not be enumerated (the sweep script can find them by listing the bucket)",
    };
  }

  return { keys, deleted: result.deleted, failed: result.failed, purgedUrls };
}

/**
 * Evict the deleted objects from the CDN.
 *
 * R2 objects served through a custom domain are cached at the edge, and the
 * cache does not know the object is gone: without this, a reader (or a crawler)
 * can still be served the truck image from cache after the file was deleted.
 *
 * Two mechanisms, both best-effort. The Cache API covers the case where the
 * media domain is the same zone as the Worker; the purge API covers a separate
 * zone, when a token with `cache purge` permission is configured. Neither is
 * allowed to fail a deletion.
 */
async function purgeEdgeCache(publicBase: string, keys: readonly string[]): Promise<string[]> {
  if (!keys.length) return [];
  const urls = keys.map((key) => `${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`);

  // Same-zone cache.
  try {
    const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (cache?.delete) {
      await Promise.all(urls.map((url) => cache.delete(url).catch(() => false)));
    }
  } catch (error) {
    console.warn("[article-deletion] Cache API purge skipped:", error);
  }

  // Separate-zone purge (optional; only fires when credentials are present).
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_PURGE_API_TOKEN;
  if (zoneId && token) {
    // The purge endpoint accepts at most 30 files per request.
    for (let i = 0; i < urls.length; i += 30) {
      const batch = urls.slice(i, i + 30);
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

  return urls;
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
  const tags = articleMutationTags({
    slug: article.slug,
    category: article.category,
    authorModel: article.authorModel,
    tagSlugs: article.tagSlugs,
  });
  for (const tag of tags) {
    await revalidateTag(tag, "max");
  }

  const paths = new Set<string>([
    "/",
    "/latest",
    "/search",
    `/article/${article.slug}`,
    "/feed.xml",
    "/rss.xml",
    "/sitemap.xml",
    "/sitemap/pages.xml",
    "/sitemap/articles.xml",
  ]);
  if (article.category?.slug) paths.add(`/category/${article.category.slug}`);
  if (article.authorModel?.slug) paths.add(`/author/${article.authorModel.slug}`);
  for (const tagSlug of article.tagSlugs ?? []) paths.add(`/tag/${tagSlug}`);

  for (const path of paths) {
    await revalidatePath(path);
  }
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
    await enqueueGoogleIndexing(article.slug, "URL_DELETED");
  } catch (error) {
    console.warn("[article-deletion] Indexing notification failed:", error);
  }
}
