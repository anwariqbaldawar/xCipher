"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import SearchResultList, { type SearchListState } from "./SearchResultList";
import { useInstantSearch, useRecentSearches } from "./useInstantSearch";
import type { LiveSearchResult } from "@/lib/search-types";

// ─────────────────────────────────────────────────────────────────────────────
// Search overlay (⌘K / Ctrl-K)
//
// Search-as-you-type in a glass panel. Typing two or more characters queries
// GET /api/search after a 200ms debounce and renders the matches without any
// submit or page reload; ↑/↓ move through them, Enter opens the highlighted
// story, Esc closes the overlay.
//
// The previous implementation required a complete word plus Enter, and its
// results list was title-only text. This one shows the featured image
// thumbnail (resolved from Cloudflare R2 on the server), the section badge, the
// author and publish date, plus a chip explaining why the row matched.
// ─────────────────────────────────────────────────────────────────────────────

interface SearchContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SearchContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
      <SearchModal />
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used within a SearchProvider");
  return context;
}

export function SearchButton() {
  const { setIsOpen } = useSearch();
  return (
    <button
      className="icon-btn"
      aria-label="Search site"
      aria-haspopup="dialog"
      onClick={() => setIsOpen(true)}
    >
      <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </button>
  );
}

/**
 * Take back the history entry the overlay pushed when it opened.
 *
 * Opening the panel pushes `{ searchOpen: true }` so that a phone's Back
 * gesture closes the search instead of leaving the story; the entry therefore
 * has to be removed again when the reader closes the panel some other way, or
 * Back would silently do nothing afterwards.
 *
 * `navigating` is set when a route change follows the close (a result was
 * opened, or the full results page was requested). Popping in that case would
 * race the navigation — `router.push` and `history.back()` in one tick resolve
 * in whatever order the browser chooses — so the entry is collapsed in place
 * instead, which also leaves Next's own history state untouched.
 */
function releaseHistoryEntry(
  entry: { current: boolean },
  unwinding: { current: boolean },
  navigating: boolean,
) {
  if (!entry.current) return;
  entry.current = false;

  const state = window.history.state as Record<string, unknown> | null;
  if (!state?.searchOpen) return; // the Back button already consumed it

  if (navigating) {
    const rest = { ...state };
    delete rest.searchOpen;
    window.history.replaceState(rest, "");
    return;
  }

  // `back()` reports itself through the same listener a hardware Back does.
  unwinding.current = true;
  window.history.back();
}

function SearchModal() {
  const { isOpen, setIsOpen } = useSearch();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  /** True while this overlay owns the extra history entry it pushed on open. */
  const historyEntryRef = useRef(false);
  /** True between `history.back()` and the popstate it produces. */
  const unwindingRef = useRef(false);
  const { recent, remember, clear } = useRecentSearches();

  /**
   * Closes the panel; the query itself is cleared when it next opens.
   *
   * Idempotent: `releaseHistoryEntry` returns immediately unless this overlay
   * still owns its history entry, so closing an already-closed panel (⌘K twice,
   * a stray Escape) costs nothing.
   */
  const close = useCallback((after?: () => void) => {
    setIsOpen(false);
    releaseHistoryEntry(historyEntryRef, unwindingRef, Boolean(after));
    after?.();
  }, [setIsOpen]);

  const openResult = useCallback((result: LiveSearchResult) => {
    remember(result.title);
    close(() => router.push(result.url));
  }, [close, remember, router]);

  const search = useInstantSearch({
    enabled: isOpen,
    limit: 8,
    onSelect: openResult,
  });

  const submitFullSearch = useCallback(() => {
    const term = search.query.trim();
    if (!term) return;
    remember(term);
    close(() => router.push(`/search?q=${encodeURIComponent(term)}`));
  }, [close, remember, router, search.query]);

  // Enter is handled explicitly rather than relying on the browser's implicit
  // form submission: `useInstantSearch` already consumed the key when a row was
  // highlighted (it calls preventDefault), so reaching this point means the
  // reader wants the full, paginated results page.
  const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    search.onKeyDown(event);
    if (event.key === "Enter" && !event.defaultPrevented) {
      event.preventDefault();
      submitFullSearch();
    }
  }, [search, submitFullSearch]);

  // The panel stays mounted and CSS `visibility` takes it out of the tab order
  // when closed, which keeps the exit transition that unmounting would cut off.
  // Everything deferred onto a timer here (focus, clearing last session's query)
  // happens after paint, never as a synchronous state write during the effect.
  const resetSearch = search.reset;
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      resetSearch();
      inputRef.current?.focus();
    }, 40);
    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, resetSearch]);

  // The history trap. One extra entry exists only while the panel is open, so a
  // phone's system Back button or a back-swipe has something to pop that means
  // "close the search" instead of "leave the story". Next's own history state is
  // carried over so App Router can still resolve the entry.
  useEffect(() => {
    if (!isOpen || typeof window === "undefined" || historyEntryRef.current) return;
    const current = window.history.state as Record<string, unknown> | null;
    window.history.pushState({ ...(current ?? {}), searchOpen: true }, "");
    historyEntryRef.current = true;
  }, [isOpen]);

  // A system Back / back-swipe while the panel is open closes it and goes no
  // further; the reader stays on the story they were reading.
  useEffect(() => {
    const handlePopState = () => {
      // This entry is being popped by `releaseHistoryEntry`, not by the reader:
      // there is nothing left to close, and swallowing it here keeps a reopen in
      // the same tick from being closed again by the unwind it inherited.
      if (unwindingRef.current) {
        unwindingRef.current = false;
        return;
      }
      if (!historyEntryRef.current) return;
      historyEntryRef.current = false;
      setIsOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        // Not `setIsOpen(prev => !prev)`: closing has to also release the
        // history entry, or ⌘K-⌘K would leave a Back press doing nothing.
        close();
        return;
      }
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen, setIsOpen]);

  const state: SearchListState = search.error
    ? "error"
    : search.isLoading
      ? "loading"
      : search.isEmpty
        ? "empty"
        : search.results.length
          ? "results"
          : "idle";

  const activeId = state === "results" && search.activeIndex >= 0
    ? `site-search-option-${search.activeIndex}`
    : undefined;

  return (
    <div
      className={`search-overlay ${isOpen ? "is-open" : "is-closing"}`}
      onClick={() => close()}
      role="presentation"
    >
      <div
        className="search-panel-glass"
        role="dialog"
        aria-modal="true"
        aria-label="Search xSypher"
        onClick={(event) => event.stopPropagation()}
      >
        <form
          className="search-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            submitFullSearch();
          }}
        >
          <Search className="search-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search stories, tags, authors…"
            className="search-input"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={state === "results" || state === "empty"}
            aria-controls="site-search-list"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-label="Search xSypher"
          />

          {search.isLoading ? (
            <span className="search-spinner" aria-hidden="true" />
          ) : search.query ? (
            <button
              type="button"
              className="search-input-clear"
              aria-label="Clear search"
              onClick={() => {
                search.reset();
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="search-kbd">⌘K</kbd>
          )}

          {/* The close affordance a touch device needs: no Esc key, and on a
              phone the panel fills the viewport so there is no visible
              backdrop left to tap. 44x44 CSS px on touch (see globals.css). */}
          <button
            type="button"
            className="search-close"
            aria-label="Close search"
            title="Close search"
            onClick={() => close()}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>

        <SearchResultList
          id="site-search"
          state={state}
          results={search.results}
          tokens={search.tokens}
          activeIndex={search.activeIndex}
          query={search.query}
          took={search.took}
          errorMessage={search.error}
          recent={recent}
          onSelect={openResult}
          onHighlight={search.setActiveIndex}
          onPickRecent={(term) => {
            search.setQuery(term);
            inputRef.current?.focus();
          }}
          onClearRecent={clear}
          onDismiss={() => close()}
        />

        <div className="search-panel-foot">
          <span><kbd className="search-kbd-sm">↑</kbd><kbd className="search-kbd-sm">↓</kbd> navigate</span>
          <span><kbd className="search-kbd-sm">↵</kbd> open</span>
          <span><kbd className="search-kbd-sm">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
