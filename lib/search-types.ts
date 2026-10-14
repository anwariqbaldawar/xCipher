// ─────────────────────────────────────────────────────────────────────────────
// Search result contracts
// ─────────────────────────────────────────────────────────────────────────────
//
// Kept out of lib/search.ts (which is `server-only`, because it talks to
// Postgres) so the client components that render a live result can import the
// shape without dragging the database module into the browser bundle.
// ─────────────────────────────────────────────────────────────────────────────

/** Which field produced a match — drives the relevance chip on a result card. */
export type MatchField =
  | "title"
  | "slug"
  | "tag"
  | "summary"
  | "category"
  | "author"
  | "content"
  | "none";

export interface LiveSearchResult {
  id: string;
  slug: string;
  title: string;
  /** Canonical path of the story, ready for `<Link href>`. */
  url: string;
  /** Word-boundary excerpt of the deck. */
  excerpt: string;
  /** CDN-ready thumbnail (Cloudflare-transformed for R2 images). */
  image: string;
  /** Raw stored value, so the client can re-derive another width. */
  imageKey: string | null;
  publishedAt: string | null;
  readingTime: number;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  authorSlug: string | null;
  authorAvatar: string | null;
  matchField: MatchField;
  matchLabel: string | null;
  matchedTags: string[];
  score: number;
}

export interface LiveSearchResponse {
  query: string;
  results: LiveSearchResult[];
  count: number;
  took?: number;
  /** True when the query was shorter than the minimum live-search length. */
  tooShort?: boolean;
  error?: string;
}
