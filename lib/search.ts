import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Live article search — zero database wake-ups
// ─────────────────────────────────────────────────────────────────────────────
//
// This module used to run one ranked SQL statement per keystroke: ILIKE across
// title/slug/deck/category/author/tags, a full-text branch against the
// `Article_search_idx` GIN index, and a scored ORDER BY. It worked, and it was
// the single most expensive thing about the reading experience — Neon bills
// compute in CU-hours and suspends after ~5 minutes idle, so a reader typing
// "graph" (six debounced requests) woke the compute and then held it awake for
// the five-minute window after the last one. A crawler following /search links,
// or a single person on the homepage, did the same thing all day.
//
// The query is now executed once per day instead of once per keystroke:
//
//   getPublishedSearchIndex()      lib/cached-queries.ts
//     -> `unstable_cache`, tags `search-index` + `articles`, 24 h ceiling
//   loadSearchIndex()              (this file)
//     -> one process-local memo read, no data-cache JSON.parse per keystroke
//   rankSearchIndex()              lib/search-index.ts
//     -> pure, in-memory scoring over the snapshot
//
// What did NOT change: the return type (`LiveSearchResult[]`), the scoring model
// and its tie-breaks, the shape of a result row, the `matchField`/`matchLabel`
// chips, and the fact that `took` on the response is measured around the real
// work. The /api/search contract and every client component that consumes it are
// untouched — see tests/zero-db-search.test.ts, which asserts the endpoint's
// response shape against the index path and that no SQL is issued.
// ─────────────────────────────────────────────────────────────────────────────

import { getPublishedSearchIndex } from "@/lib/cached-queries";
import { rankSearchIndex, type SearchIndexPayload } from "@/lib/search-index";
import { readSearchIndexMemory, writeSearchIndexMemory } from "@/lib/search-index-memory";
import { normalizeQuery } from "@/lib/search-query";

export type { LiveSearchResult } from "@/lib/search-types";
export type { SearchIndexEntry, SearchIndexPayload, SearchIndexTag } from "@/lib/search-index";

export interface LiveSearchOptions {
  limit?: number;
  offset?: number;
}

/**
 * The snapshot, memoized in this process for a short window.
 *
 * The data cache is the source of truth; this only avoids re-parsing the whole
 * archive out of JSON on every keystroke. `forgetSearchIndexMemory()` is called
 * by the tag-invalidation wrapper, so an editor's save is visible to the very
 * next search in the process that handled it.
 *
 * A failed read is *not* memoized and *not* swallowed: the route turns it into a
 * 503 and the client retries once (useInstantSearch), which is the same contract
 * the SQL version had — a cold compute that misses the pool's connect timeout
 * used to surface exactly this way.
 */
export async function loadSearchIndex(): Promise<SearchIndexPayload> {
  const memoized = readSearchIndexMemory<SearchIndexPayload>();
  if (memoized) return memoized;

  const payload = await getPublishedSearchIndex();
  writeSearchIndexMemory(payload);
  return payload;
}

/**
 * Ranked live search over the cached snapshot.
 *
 * Signature-compatible with the SQL implementation it replaces, so
 * `/api/search` and `/search` needed no changes to their call sites.
 */
export async function searchArticlesLive(
  rawQuery: string,
  options: LiveSearchOptions = {},
): Promise<ReturnType<typeof rankSearchIndex>> {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const { entries } = await loadSearchIndex();
  return rankSearchIndex(entries, query, options);
}
