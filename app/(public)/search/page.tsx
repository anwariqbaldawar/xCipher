import type { Metadata } from "next";
import StoryRow, { type StoryArticle } from "@/components/article/StoryRow";
import Sidebar from "@/components/layout/Sidebar";
import InstantSearchInput from "@/components/search/InstantSearchInput";
import { normalizeQuery } from "@/lib/search-query";
import { loadSearchIndex } from "@/lib/search";
import { rankSearchIndex, toSearchListingRow } from "@/lib/search-index";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = normalizeQuery(typeof params.q === "string" ? params.q : "");

  return {
    title: q ? `Search results for "${q}" — xSypher` : "Search — xSypher",
    alternates: { canonical: q ? `/search?q=${encodeURIComponent(q)}` : "/search" },
    robots: {
      index: false,
      follow: true,
    },
  };
}

// Still rendered per request — a results page is defined by its query string —
// but no longer backed by a per-request query. Every row on this page comes out
// of the cached published-articles snapshot (lib/cached-queries.ts
// `getPublishedSearchIndex`), so this route, which crawlers and "See all
// results" clicks hit constantly, costs one data-cache read and no SQL.
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = normalizeQuery(typeof params.q === "string" ? params.q : "");
  const cat = typeof params.cat === "string" ? params.cat : "";
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  let results: StoryArticle[] = [];
  let totalCount = 0;
  // The ranked listing is paged by LIMIT/OFFSET, so the only fact the pager
  // needs is whether the page came back full. A total count would mean scanning
  // the ranked set twice for a number nobody reads.
  let hasMorePages = false;

  if (q || cat) {
    // One snapshot read, then pure in-memory work. `loadSearchIndex` is memoized
    // per process for a few seconds, so the dropdown the reader just used and
    // this page share the same parsed object.
    const { entries } = await loadSearchIndex();

    if (cat) {
      // Category-browse mode (?cat=) keeps the card-shaped rows the listing
      // components expect, filtered by section. The snapshot is ordered
      // publishedAt DESC, id DESC — the same order the SQL listing used.
      const inCategory = entries.filter(entry => entry.categorySlug === cat);
      results = inCategory.slice(skip, skip + limit).map(entry => toSearchListingRow(entry));
      totalCount = inCategory.length;
      hasMorePages = skip + limit < inCategory.length;
    } else {
      // The listing runs through the same ranker the live dropdown uses
      // (lib/search-index.ts) — matched fields, partial-word prefixes and tag
      // joins all behave identically — so "see all results" is an ordered
      // continuation of what the reader already saw rather than a differently
      // sorted list. Rows are rebuilt from the snapshot rather than hydrated
      // with a second query.
      const ranked = rankSearchIndex(entries, q, { limit, offset: skip });
      const byId = new Map(entries.map(entry => [entry.id, entry]));
      results = ranked
        .map(result => byId.get(result.id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map(entry => toSearchListingRow(entry));
      totalCount = results.length;
      hasMorePages = results.length === limit;
    }
  }

  const hasNextPage = hasMorePages;
  const hasPrevPage = page > 1;

  return (
    <div className="wrap">
      <section className="cat-hero" style={{ marginBottom: 0 }}>
        <span className="kicker">Search</span>
        <h1>{q ? `Results for "${q}"` : cat ? `Results in category` : "Search xSypher"}</h1>
        <p>
          {q || cat
            ? `Found ${totalCount} ${totalCount === 1 ? "story" : "stories"}.`
            : "Start typing — results appear instantly, no need to press Enter."}
        </p>

        {/* Instant, debounced results inline. Enter (with no row highlighted)
            still lands here with the full, paginated listing. */}
        <div style={{ marginTop: "24px", maxWidth: "640px" }}>
          <InstantSearchInput initialQuery={q} />
        </div>
      </section>

      <div className="cat-body">
        <div>
          {results.length > 0 ? (
            <div className="day-group">
              <div className="day-label" style={{ marginBottom: "16px" }}>Stories</div>
              {results.map(a => <StoryRow key={a.id} article={a} />)}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", padding: "16px 0", borderTop: "1px solid var(--line)" }}>
                {hasPrevPage ? (
                  <a href={`/search?q=${encodeURIComponent(q)}&cat=${encodeURIComponent(cat)}&page=${page - 1}`} className="btn-cs">← Previous Page</a>
                ) : <span />}
                {hasNextPage && (
                  <a href={`/search?q=${encodeURIComponent(q)}&cat=${encodeURIComponent(cat)}&page=${page + 1}`} className="btn-cs primary">Next Page →</a>
                )}
              </div>
            </div>
          ) : (
            (q || cat) ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>No results found</h3>
                <p className="muted">We couldn&apos;t find any stories matching your criteria. Try a shorter word, or a section, tag or author name.</p>
              </div>
            ) : null
          )}
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
