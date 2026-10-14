// ─────────────────────────────────────────────────────────────────────────────
// Search query helpers
// ─────────────────────────────────────────────────────────────────────────────
//
// Pure, framework-free and shared by the client (highlighting, keyboard hints)
// and the server (SQL patterns, full-text ranking). Nothing here touches the
// database or the DOM, so it is safe in either bundle and directly testable.

import type { MatchField } from "@/lib/search-types";
import { escapeLikePattern } from "@/lib/search-pattern";

// Re-exported so consumers of the live-search helpers can reach the escaper
// without a second import; the implementation stays in lib/search-pattern.ts,
// which is what the audited tests pin.
export { escapeLikePattern };

/** Hard ceilings. A search box is not an input for an essay. */
export const MAX_QUERY_LENGTH = 80;
export const MAX_TOKENS = 6;
/**
 * Canonical form of whatever the reader typed.
 *
 * Collapses runs of whitespace, strips control characters (a paste out of a PDF
 * arrives with them), and truncates. Returns "" for input that is only noise,
 * which every caller treats as "no query".
 */
export function normalizeQuery(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  return raw
    // Deliberate: strips C0/C1 control characters (a paste out of a PDF or a
    // terminal arrives with them, and they break both ILIKE and tsquery).
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/**
 * Words used for highlighting and for the `ILIKE` patterns.
 *
 * Unicode-aware so non-Latin headlines still highlight, lowercased, de-duped and
 * capped at {@link MAX_TOKENS}. The whole (normalized) query is included as well
 * so a multi-word phrase can be matched as typed.
 */
export function extractSearchTokens(query: string): string[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const words = normalized
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.-]+/u)
    .map(word => word.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter(word => word.length >= 1);

  return [...new Set(words)].slice(0, MAX_TOKENS);
}

/** The `%term%` wildcard pattern used against the text columns. */
export function buildLikePattern(query: string): string {
  return `%${escapeLikePattern(normalizeQuery(query))}%`;
}

/**
 * Prefix-aware websearch-style tsquery string, e.g.
 *
 *   "graph"          → "graph:*"
 *   "ai security"    → "ai:* & security:*"
 *   "!!!"            → null   (nothing to search)
 *
 * Prefix syntax (`:*`) is what makes the full-text branch fire while the reader
 * is still typing — `plainto_tsquery` only matches complete lexemes, so a
 * half-typed word would otherwise fall back to the slower ILIKE scan alone.
 *
 * Only [a-z0-9] survives, so the result cannot carry tsquery operators and no
 * user input is ever interpreted as syntax.
 */
export function buildPrefixTsQuery(query: string): string | null {
  const words = normalizeQuery(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 2)
    .slice(0, MAX_TOKENS);

  if (!words.length) return null;
  return words.map(word => `${word}:*`).join(" & ");
}

/** Trim a body/deck string to a card-sized, word-boundary excerpt. */
export function truncateExcerpt(text: string | null | undefined, max = 140): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Split `text` into alternating plain / matched segments for rendering.
 *
 * Used by the result cards to mark the characters the reader actually typed.
 * Longest tokens win so "search" beats "sea" when both are present.
 */
export function highlightSegments(text: string, tokens: string[]): { text: string; match: boolean }[] {
  if (!text) return [];
  const usable = tokens
    .map(token => token.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!usable.length) return [{ text, match: false }];

  const lowered = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];

  for (const token of usable) {
    const needle = token.toLowerCase();
    let index = lowered.indexOf(needle);
    while (index !== -1) {
      const range = { start: index, end: index + needle.length };
      // Skip ranges already covered by a longer token's match.
      if (!ranges.some(existing => range.start >= existing.start && range.end <= existing.end)) {
        ranges.push(range);
      }
      index = lowered.indexOf(needle, index + needle.length);
    }
  }

  if (!ranges.length) return [{ text, match: false }];
  ranges.sort((a, b) => a.start - b.start);

  const segments: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), match: false });
    segments.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

/** Human label for the "why did this match" chip on a live result. */
export function describeMatchField(field: MatchField, matchedTags: string[] = []): string | null {
  switch (field) {
    case "title":
      return "Title match";
    case "slug":
      return "Exact URL match";
    case "tag":
      return matchedTags.length ? `Tagged ${matchedTags.slice(0, 2).join(", ")}` : "Tag match";
    case "summary":
      return "In the summary";
    case "category":
      return "Section match";
    case "author":
      return "Author match";
    case "content":
      return "Mentioned in the story";
    default:
      return null;
  }
}

/** Minimum characters before the live dropdown queries the API. */
export const MIN_LIVE_QUERY_LENGTH = 2;

/** Debounce window for the live query, in milliseconds. */
export const LIVE_SEARCH_DEBOUNCE_MS = 200;
