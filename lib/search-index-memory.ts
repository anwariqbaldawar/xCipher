// ─────────────────────────────────────────────────────────────────────────────
// Process-local memo for the published-articles search index
// ─────────────────────────────────────────────────────────────────────────────
//
// `getPublishedSearchIndex()` (lib/cached-queries.ts) is a Next data-cache
// entry, which is the right layer for correctness: it is shared across requests
// and dropped by `revalidateTag`. It is not, however, free to read.
//
// A data-cache read hands back serialized JSON, so every keystroke inside the
// live-search modal would pay a `JSON.parse` of the whole archive snapshot
// before the ranker even starts — the exact cost this caching layer exists to
// remove. This module keeps the *parsed* payload for a short window so a burst
// of keystrokes (and every other reader served by the same instance in that
// window) ranks against an object that is already in memory.
//
// Deliberately dependency-free: `lib/revalidate.ts` imports it to drop the memo
// the instant an editor's mutation invalidates a tag, and that wrapper must stay
// cheap enough to sit in front of every `revalidateTag` call in the app. Nothing
// here touches the database, Next's cache, or the network.
//
// Staleness budget: `forgetSearchIndex()` is called from the tag-invalidation
// helper, so the same server process that handled an admin mutation serves the
// next search from a rebuilt index immediately. The TTL is what bounds a
// *different* process (another container, another Worker isolate) that never saw
// the mutation. It is short on purpose — 15 seconds by default — and
// `SEARCH_INDEX_MEMORY_TTL_MS=0` disables the memo entirely for an operator who
// would rather always read through the shared cache.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 15_000;

let memo: { payload: unknown; expiresAt: number } | null = null;

/** Memo window in milliseconds. `0` turns the memo off. */
export function searchIndexMemoryTtlMs(): number {
  const raw = process.env.SEARCH_INDEX_MEMORY_TTL_MS;
  if (raw === undefined || raw === "") return DEFAULT_TTL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_TTL_MS;
  return parsed;
}

/** The memoized payload, or null when it is absent or past its window. */
export function readSearchIndexMemory<T>(now: number = Date.now()): T | null {
  if (!memo) return null;
  if (memo.expiresAt <= now) {
    memo = null;
    return null;
  }
  return memo.payload as T;
}

/** Store a freshly read payload. A zero TTL stores nothing. */
export function writeSearchIndexMemory(payload: unknown, now: number = Date.now()): void {
  const ttl = searchIndexMemoryTtlMs();
  memo = ttl > 0 ? { payload, expiresAt: now + ttl } : null;
}

/**
 * Drop the memo.
 *
 * Called on every `articles` / `search-index` tag invalidation: an editor who
 * publishes or edits a story must see it in the dropdown on the next keystroke,
 * not when the memo's TTL happens to expire.
 */
export function forgetSearchIndexMemory(): void {
  memo = null;
}
