import { revalidatePath as nextRevalidatePath, revalidateTag as nextRevalidateTag } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { forgetSearchIndexMemory } from "./search-index-memory";

// ─────────────────────────────────────────────────────────────────────────────
// Cache invalidation, wrapped so a failure cannot fail the caller's write.
//
// The write has already been committed by the time these run; a revalidation
// that throws must not turn a successful publish into an error dialog. Failures
// are logged and swallowed, which is why every admin mutation uses these instead
// of importing `next/cache` directly.
//
// One extra job here: the in-memory search snapshot. Live search keeps the parsed
// published-articles index in this process for a few seconds so a burst of
// keystrokes does not re-parse several megabytes of JSON (see
// lib/search-index-memory.ts). Dropping it on the invalidation that a mutation
// already performs is what makes a publish visible to the *next keystroke*
// rather than to the next memo expiry — no second call site to remember, and no
// way for a new mutation to invalidate the shared cache yet leave this process
// serving a stale index.
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_INDEX_TAGS = new Set<string>([CACHE_TAGS.searchIndex, CACHE_TAGS.articles]);

export async function revalidatePath(path: string, type?: "layout" | "page") {
  try {
    if (type) {
      await nextRevalidatePath(path, type);
    } else {
      await nextRevalidatePath(path);
    }
  } catch (e) {
    console.warn(`[revalidate] Ignored error revalidating path ${path}:`, e);
  }
}

export async function revalidateTag(tag: string, profile: "max" | { expire: number } = "max") {
  try {
    await nextRevalidateTag(tag, profile);
  } catch (e) {
    console.warn(`[revalidate] Ignored error revalidating tag ${tag}:`, e);
  } finally {
    // `finally`: the memo must go even when the shared-cache call failed, since
    // a stale local snapshot is worse than a stale shared one — the local copy
    // is the one the next keystroke reads.
    if (SEARCH_INDEX_TAGS.has(tag)) forgetSearchIndexMemory();
  }
}
