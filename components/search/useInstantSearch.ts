"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { LiveSearchResult, LiveSearchResponse } from "@/lib/search-types";
import {
  LIVE_SEARCH_DEBOUNCE_MS,
  MIN_LIVE_QUERY_LENGTH,
  extractSearchTokens,
  normalizeQuery,
} from "@/lib/search-query";

// ─────────────────────────────────────────────────────────────────────────────
// useInstantSearch
// ─────────────────────────────────────────────────────────────────────────────
//
// Search-as-you-type against GET /api/search.
//
// Three properties this hook is responsible for, all of which the previous
// "type a whole word, then press the button" flow did not have:
//
//   1. DEBOUNCED — one request per ~200ms burst of typing, not one per keystroke.
//   2. ABORTABLE — the in-flight request is cancelled when the query moves on,
//      so a slow response for "gr" cannot overwrite the results for "graph".
//   3. ORDERED — every response carries a sequence number and is dropped unless
//      it belongs to the newest query. The abort covers the in-flight request;
//      this covers a response that was already queued when the reader typed.
//
// State shape: one `snapshot` keyed by the query it answered, plus the live
// `query`. Everything else — `isLoading`, `isEmpty`, `results` — is derived from
// those two during render. Nothing calls setState synchronously inside an effect
// (React's compiler rules treat that as a cascading render), which is why the
// "query too short" case simply yields empty results instead of clearing them.
//
// It also owns the keyboard model (↑/↓/Home/End/Enter) so the ⌘K modal and the
// inline input on /search behave identically rather than each inventing one.

export interface UseInstantSearchOptions {
  /** Live-query only while true (e.g. the modal is open). */
  enabled?: boolean;
  /** Results to request. */
  limit?: number;
  /** Called when the reader commits a selection (Enter or click). */
  onSelect?: (result: LiveSearchResult) => void;
}

export interface InstantSearchState {
  query: string;
  setQuery: (value: string) => void;
  results: LiveSearchResult[];
  tokens: string[];
  isLoading: boolean;
  /** True once a searchable query has returned zero results. */
  isEmpty: boolean;
  /** True while the reader has not yet typed enough to search. */
  isIdle: boolean;
  error: string | null;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Move the highlight, wrapping at both ends. */
  move: (delta: number) => void;
  reset: () => void;
  select: (index: number) => void;
  /** Keyboard handler to spread onto the input. */
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** True once at least one query has completed, so an empty box shows hints
   *  rather than "no results". */
  hasSearched: boolean;
  took: number | null;
}

interface SearchSnapshot {
  /** The normalized query this snapshot answers. */
  query: string;
  results: LiveSearchResult[];
  took: number | null;
}

const EMPTY_SNAPSHOT: SearchSnapshot = { query: "", results: [], took: null };

export function useInstantSearch(options: UseInstantSearchOptions = {}): InstantSearchState {
  const { enabled = true, limit = 8, onSelect } = options;

  const [query, setQueryState] = useState("");
  const [snapshot, setSnapshot] = useState<SearchSnapshot>(EMPTY_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  // Kept in a ref so a changing callback identity cannot re-fire the request.
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const normalized = normalizeQuery(query);
  const isIdle = !enabled || normalized.length < MIN_LIVE_QUERY_LENGTH;
  const tokens = useMemo(() => extractSearchTokens(query), [query]);

  // The last answered results stay on screen while the next request is in
  // flight: blanking the list on every keystroke makes the dropdown flicker.
  // Memoised on the snapshot array itself (not on a derived boolean) so the
  // callbacks below keep stable dependencies between renders.
  const results = useMemo(
    () => (isIdle ? [] : snapshot.results),
    [isIdle, snapshot.results],
  );
  const isLoading = !isIdle && snapshot.query !== normalized;
  const isEmpty = !isIdle && !isLoading && !error && hasSearched && results.length === 0;

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sequenceRef.current += 1;
    setQueryState("");
    setSnapshot(EMPTY_SNAPSHOT);
    setError(null);
    setActiveIndex(-1);
    setHasSearched(false);
  }, []);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    // A new keystroke invalidates any previous failure so the dropdown stops
    // showing "unavailable" the moment the reader keeps typing.
    setError(null);
  }, []);

  useEffect(() => {
    if (isIdle) {
      // Abandon anything in flight; the derived `results` above already hides
      // the previous answer. No setState here on purpose.
      abortRef.current?.abort();
      abortRef.current = null;
      sequenceRef.current += 1;
      return;
    }

    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    const requested = normalized;

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(requested)}&limit=${limit}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );

        if (!response.ok && response.status !== 429) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const payload: LiveSearchResponse = await response.json();

        // A response for an older query is discarded rather than rendered.
        if (sequence !== sequenceRef.current) return;

        if (!response.ok) {
          setSnapshot({ query: requested, results: [], took: null });
          setActiveIndex(-1);
          setError(payload.error === "rate_limited"
            ? "Too many searches just now. Give it a second."
            : "Search is unavailable right now.");
          return;
        }

        const nextResults = payload.results || [];
        setSnapshot({
          query: requested,
          results: nextResults,
          took: typeof payload.took === "number" ? payload.took : null,
        });
        // Highlight the top result so Enter needs no arrow key first.
        setActiveIndex(nextResults.length ? 0 : -1);
        setHasSearched(true);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") return;
        if (sequence !== sequenceRef.current) return;
        console.error("[search] live query failed:", caught);
        setSnapshot({ query: requested, results: [], took: null });
        setActiveIndex(-1);
        setError("Search is unavailable right now.");
      }
    }, LIVE_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [normalized, isIdle, limit]);

  const move = useCallback((delta: number) => {
    setActiveIndex(current => {
      const total = results.length;
      if (!total) return -1;
      const next = current + delta;
      if (next < 0) return total - 1;
      if (next >= total) return 0;
      return next;
    });
  }, [results.length]);

  const select = useCallback((index: number) => {
    const result = results[index];
    if (!result) return;
    onSelectRef.current?.(result);
  }, [results]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        if (results.length) { event.preventDefault(); setActiveIndex(0); }
        break;
      case "End":
        if (results.length) { event.preventDefault(); setActiveIndex(results.length - 1); }
        break;
      case "Enter": {
        // Enter with a highlighted row opens that story. Enter with nothing
        // highlighted falls through to the form's submit handler, which runs the
        // full paginated search.
        if (activeIndex >= 0 && results[activeIndex]) {
          event.preventDefault();
          select(activeIndex);
        }
        break;
      }
      default:
        break;
    }
  }, [activeIndex, move, results, select]);

  return {
    query,
    setQuery,
    results,
    tokens,
    isLoading,
    isEmpty,
    isIdle,
    error,
    // Clamped: the highlight can never point past a shorter result set.
    activeIndex: activeIndex >= 0 && activeIndex < results.length ? activeIndex : (results.length ? 0 : -1),
    setActiveIndex,
    move,
    reset,
    select,
    onKeyDown,
    hasSearched,
    took: snapshot.query === normalized ? snapshot.took : null,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Recent searches
 *
 * Kept in localStorage, read through useSyncExternalStore rather than an effect:
 * the browser store is genuinely external state, this keeps the server snapshot
 * deterministic (so there is no hydration mismatch), and it picks up a second
 * tab editing the same key for free.
 * ───────────────────────────────────────────────────────────────────────────── */

const RECENT_KEY = "xsypher:recent-searches";
const RECENT_MAX = 5;
const RECENT_EVENT = "xsypher:recent-searches";
/** Stable identity for the server render and for "nothing stored yet". */
const NO_RECENT: string[] = [];

let cachedRaw: string | null = null;
let cachedList: string[] = NO_RECENT;

function parseRecent(raw: string | null): string[] {
  if (!raw) return NO_RECENT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return NO_RECENT;
    return parsed.filter((item): item is string => typeof item === "string").slice(0, RECENT_MAX);
  } catch {
    return NO_RECENT;
  }
}

function subscribeToRecent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_EVENT, onChange);
  };
}

function getRecentSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RECENT_KEY);
  } catch {
    // localStorage can be unavailable (Safari private mode, blocked cookies).
    // A missing history is not an error worth surfacing.
    return NO_RECENT;
  }
  // getSnapshot must return a referentially stable value or React re-renders
  // forever; the raw string comparison is the cheap guard for that.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseRecent(raw);
  }
  return cachedList;
}

function getRecentServerSnapshot(): string[] {
  return NO_RECENT;
}

function writeRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Non-fatal: the in-memory store still drives this session's UI.
  }
  cachedRaw = null; // force the next read to re-parse
  window.dispatchEvent(new Event(RECENT_EVENT));
}

export function useRecentSearches() {
  const recent = useSyncExternalStore(subscribeToRecent, getRecentSnapshot, getRecentServerSnapshot);

  const remember = useCallback((term: string) => {
    const value = normalizeQuery(term);
    if (!value) return;
    const current = getRecentSnapshot();
    writeRecent([value, ...current.filter(item => item.toLowerCase() !== value.toLowerCase())].slice(0, RECENT_MAX));
  }, []);

  const clear = useCallback(() => writeRecent([]), []);

  return { recent, remember, clear };
}
