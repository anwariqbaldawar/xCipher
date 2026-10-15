"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, CornerDownLeft, SearchX, TriangleAlert } from "lucide-react";
import type { LiveSearchResult } from "@/lib/search-types";
import { highlightSegments } from "@/lib/search-query";
import RelativeTime from "@/components/common/RelativeTime";

// ─────────────────────────────────────────────────────────────────────────────
// Live result list
//
// Presentational only: the query, keyboard state and active index all arrive as
// props from useInstantSearch. Shared by the ⌘K modal and the inline input on
// /search so both render identical rows.
//
// Accessibility: the container is a listbox and each row an option, with
// aria-activedescendant on the input pointing at the highlighted row. Screen
// readers therefore announce the highlighted story as the reader arrows through
// results, without focus ever leaving the text field.
// ─────────────────────────────────────────────────────────────────────────────

export type SearchListState = "idle" | "loading" | "results" | "empty" | "error";

interface Props {
  id: string;
  state: SearchListState;
  results: LiveSearchResult[];
  tokens: string[];
  activeIndex: number;
  query: string;
  took?: number | null;
  errorMessage?: string | null;
  recent?: string[];
  onSelect: (result: LiveSearchResult) => void;
  onHighlight: (index: number) => void;
  onPickRecent?: (term: string) => void;
  onClearRecent?: () => void;
  /**
   * Called when the reader chooses "See all results". The modal passes a
   * handler that closes the panel before navigating; without one the footer
   * link navigates on its own (the inline /search dropdown).
   */
  onSeeAllResults?: () => void;
  /**
   * Called when the reader taps the list's own empty space — the area under the
   * last row, or the padding around it. On a phone the overlay fills the
   * viewport, so this is the "tapped outside the results" gesture that closes
   * the search; taps that land on a row or a control never reach it.
   */
  onDismiss?: () => void;
}

function Highlighted({ text, tokens }: { text: string; tokens: string[] }) {
  return (
    <>
      {highlightSegments(text, tokens).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="search-mark">{segment.text}</mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function ResultSkeleton() {
  return (
    <div className="search-row search-row-skeleton" aria-hidden="true">
      <div className="sk search-row-thumb" />
      <div className="sk-lines">
        <div className="sk sk-kicker" />
        <div className="sk sk-title" />
        <div className="sk sk-title sk-short" />
      </div>
    </div>
  );
}

function ResultRow({
  result,
  index,
  active,
  tokens,
  id,
  onSelect,
  onHighlight,
}: {
  result: LiveSearchResult;
  index: number;
  active: boolean;
  tokens: string[];
  id: string;
  onSelect: (result: LiveSearchResult) => void;
  onHighlight: (index: number) => void;
}) {
  const rowRef = useRef<HTMLAnchorElement>(null);

  // Keep the highlighted row inside the scroll viewport while arrowing through
  // a long list. `block: "nearest"` avoids scrolling the page behind the panel.
  // Guarded: scrollIntoView is absent in some embedded webviews and in jsdom.
  useEffect(() => {
    if (!active) return;
    const row = rowRef.current;
    if (typeof row?.scrollIntoView === "function") row.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <Link
      ref={rowRef}
      id={id}
      role="option"
      aria-selected={active}
      href={result.url}
      data-active={active ? "true" : "false"}
      onMouseEnter={() => onHighlight(index)}
      onClick={() => onSelect(result)}
      className="search-row group"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the URL is already
          a Cloudflare-transformed, width-capped thumbnail; routing it through
          next/image would add an optimiser hop per keystroke burst. */}
      <img
        src={result.image}
        alt=""
        width={72}
        height={54}
        loading="lazy"
        decoding="async"
        className="search-row-thumb"
      />

      <div className="search-row-body">
        <div className="search-row-topline">
          {result.categoryName && (
            <span className="search-row-cat">{result.categoryName}</span>
          )}
        </div>

        <span className="search-row-title">
          <Highlighted text={result.title} tokens={tokens} />
        </span>

        {result.excerpt && <span className="search-row-excerpt">{result.excerpt}</span>}

        <span className="search-row-meta">
          {result.authorName && (
            <span className="font-semibold">
              <Highlighted text={result.authorName} tokens={tokens} />
            </span>
          )}
          {result.authorName && result.publishedAt && <span className="search-dot">·</span>}
          {result.publishedAt && <RelativeTime dateTime={result.publishedAt} />}
          <span className="search-dot">·</span>
          <span>{result.readingTime} min read</span>
        </span>
      </div>

      <span className="search-row-action" aria-hidden="true">
        {active ? <CornerDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
      </span>
    </Link>
  );
}

export default function SearchResultList({
  id,
  state,
  results,
  tokens,
  activeIndex,
  query,
  took,
  errorMessage,
  recent = [],
  onSelect,
  onHighlight,
  onPickRecent,
  onClearRecent,
  onSeeAllResults,
  onDismiss,
}: Props) {
  return (
    <div
      className="search-results"
      id={`${id}-list`}
      role="listbox"
      aria-label="Search results"
      // `currentTarget` is the container itself: a tap on a row, a chip or the
      // footer link bubbles from a child and is left alone.
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss?.();
      }}
    >
      {state === "idle" && (
        <div className="search-hint">
          <p className="search-hint-title">
            {recent.length ? "Recent searches" : "Start typing to search"}
          </p>
          {recent.length ? (
            <>
              <div className="search-chips">
                {recent.map(term => (
                  <button
                    key={term}
                    type="button"
                    className="search-chip"
                    onClick={() => onPickRecent?.(term)}
                  >
                    {term}
                  </button>
                ))}
              </div>
              <button type="button" className="search-clear" onClick={onClearRecent}>
                Clear history
              </button>
            </>
          ) : (
            <p className="search-hint-body">
              Results appear as you type — titles, tags, sections, authors and summaries.
            </p>
          )}
        </div>
      )}

      {state === "loading" && (
        <div aria-live="polite" aria-busy="true">
          <span className="sr-only">Searching…</span>
          {Array.from({ length: 4 }).map((_, index) => (
            <ResultSkeleton key={index} />
          ))}
        </div>
      )}

      {state === "results" && (
        <>
          {results.map((result, index) => (
            <ResultRow
              key={result.id}
              id={`${id}-option-${index}`}
              result={result}
              index={index}
              active={index === activeIndex}
              tokens={tokens}
              onSelect={onSelect}
              onHighlight={onHighlight}
            />
          ))}
          <div className="search-footer">
            <span>
              {results.length} result{results.length === 1 ? "" : "s"}
              {typeof took === "number" && took > 0 ? ` · ${took} ms` : ""}
            </span>
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="search-footer-link"
              onClick={(event) => {
                if (!onSeeAllResults) return;
                // The handler owns navigation so the modal can close first —
                // following the link alone left the panel open over /search.
                event.preventDefault();
                onSeeAllResults();
              }}
            >
              See all results
            </Link>
          </div>
        </>
      )}

      {state === "empty" && (
        <div className="search-empty">
          <SearchX className="h-6 w-6" aria-hidden="true" />
          <p className="search-hint-title">No results for “{query}”</p>
          <p className="search-hint-body">
            Try a shorter word, a section name (AI, Security, Gadgets), an author or a tag.
          </p>
          <div className="search-chips">
            {["AI", "Cybersecurity", "Reviews", "How-To"].map(term => (
              <button
                key={term}
                type="button"
                className="search-chip"
                onClick={() => onPickRecent?.(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="search-empty">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
          <p className="search-hint-title">Search is temporarily unavailable</p>
          <p className="search-hint-body">{errorMessage || "Please try again in a moment."}</p>
        </div>
      )}
    </div>
  );
}
