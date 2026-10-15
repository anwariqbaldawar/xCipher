"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eraser, Search } from "lucide-react";
import SearchResultList, { type SearchListState } from "./SearchResultList";
import { useInstantSearch, useRecentSearches } from "./useInstantSearch";
import type { LiveSearchResult } from "@/lib/search-types";

// ─────────────────────────────────────────────────────────────────────────────
// InstantSearchInput
//
// The same search-as-you-type engine as the ⌘K overlay, rendered inline as a
// dropdown so the /search route also answers while the reader is still typing.
// Submitting (Enter with no row highlighted, or the button) navigates to the
// full results page, which paginates; the dropdown is the fast path to the
// right story.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Initial term, taken from the URL on a server-rendered results page. */
  initialQuery?: string;
  /** Route the form submits to when the reader wants the full listing. */
  action?: string;
  placeholder?: string;
  className?: string;
}

export default function InstantSearchInput({
  initialQuery = "",
  action = "/search",
  placeholder = "Search articles, tags, authors…",
  className = "",
}: Props) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const { recent, remember, clear } = useRecentSearches();

  const search = useInstantSearch({
    limit: 6,
    onSelect: (result: LiveSearchResult) => {
      remember(result.title);
      setOpen(false);
      router.push(result.url);
    },
  });

  // Seed from the URL once, so reopening the page with ?q= keeps the box filled
  // without fighting the reader's own typing afterwards.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !initialQuery) return;
    seeded.current = true;
    search.setQuery(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const submit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const term = search.query.trim();
    if (!term) return;
    remember(term);
    setOpen(false);
    router.push(`${action}?q=${encodeURIComponent(term)}`);
  }, [action, remember, router, search.query]);

  const state: SearchListState = search.error
    ? "error"
    : search.isLoading
      ? "loading"
      : search.isEmpty
        ? "empty"
        : search.results.length
          ? "results"
          : "idle";

  const showDropdown = open && (search.query.length >= 2 || recent.length > 0 || state === "error");

  return (
    <div ref={wrapperRef} className={`instant-search ${className}`}>
      <form onSubmit={submit} className="search-input-row search-input-row-inline" role="search">
        <Search className="search-input-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={search.query}
          onChange={(event) => {
            search.setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
              return;
            }
            search.onKeyDown(event);
            // Enter with a highlighted row was already handled (and consumed)
            // above; anything else submits the full search form.
            if (event.key === "Enter" && !event.defaultPrevented) {
              event.preventDefault();
              const term = search.query.trim();
              if (!term) return;
              remember(term);
              setOpen(false);
              router.push(`${action}?q=${encodeURIComponent(term)}`);
            }
          }}
          placeholder={placeholder}
          className="search-input"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="inline-search-list"
          aria-autocomplete="list"
          aria-activedescendant={
            state === "results" && search.activeIndex >= 0 ? `inline-search-option-${search.activeIndex}` : undefined
          }
          aria-label="Search xSypher"
        />
        {search.isLoading ? (
          <span className="search-spinner" aria-hidden="true" />
        ) : search.query ? (
          <button
            type="button"
            className="search-input-clear"
            aria-label="Clear search"
            onClick={() => { search.reset(); inputRef.current?.focus(); }}
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>
        ) : null}
        <button type="submit" className="btn-cs primary search-submit">Search</button>
      </form>

      {showDropdown && (
        <div className="search-dropdown-glass">
          <SearchResultList
            id="inline-search"
            state={state}
            results={search.results}
            tokens={search.tokens}
            activeIndex={search.activeIndex}
            query={search.query}
            took={search.took}
            errorMessage={search.error}
            recent={recent}
            onSelect={(result) => {
              remember(result.title);
              setOpen(false);
              router.push(result.url);
            }}
            onHighlight={search.setActiveIndex}
            onPickRecent={(term) => { search.setQuery(term); inputRef.current?.focus(); }}
            onClearRecent={clear}
            onSeeAllResults={() => {
              const term = search.query.trim();
              if (!term) return;
              remember(term);
              setOpen(false);
              router.push(`${action}?q=${encodeURIComponent(term)}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
