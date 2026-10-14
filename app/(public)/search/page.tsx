import type { Metadata } from "next";
import { dbRead as db } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";
import { article as articleTable } from "@/lib/db/schema";
import { ARTICLE_CARD_COLUMNS, ARTICLE_CARD_WITH_TAGS_WITH } from "@/lib/queries";
import StoryRow, { type StoryArticle } from "@/components/article/StoryRow";
import Sidebar from "@/components/layout/Sidebar";
import InstantSearchInput from "@/components/search/InstantSearchInput";
import { normalizeQuery } from "@/lib/search-query";
import { publicFeedWhere } from "@/lib/feed";
import { searchArticlesLive } from "@/lib/search";

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
  // The ranked listing is paged by the SQL LIMIT/OFFSET, so the only fact the
  // pager needs is whether the page came back full. A total count would cost a
  // second full-text scan for a number nobody reads.
  let hasMorePages = false;

  if (q || cat) {
    // The listing runs through the same ranker the live dropdown uses
    // (lib/search.ts) — matched fields, partial-word prefixes and tag joins all
    // behave identically — with a category filter layered on top. The headline
    // ranking lives in SQL, so "see all results" is an ordered continuation of
    // what the reader already saw rather than a differently-sorted list.
    const ranked = q ? await searchArticlesLive(q, { limit, offset: skip }) : [];

    if (cat) {
      // Category-browse mode (?cat=) keeps the card-shaped rows the listing
      // components expect, filtered by section.
      const whereClause = and(
        eq(articleTable.status, "PUBLISHED"),
        sql`${articleTable.categoryId} IN (SELECT id FROM "Category" WHERE slug = ${cat})`,
      );
      const [items, countResult] = await Promise.all([
        db.query.article.findMany({
          where: whereClause,
          orderBy: (a, { desc }) => [desc(a.publishedAt)],
          offset: skip,
          limit,
          columns: ARTICLE_CARD_COLUMNS,
          with: ARTICLE_CARD_WITH_TAGS_WITH,
        }),
        db.select({ count: sql`count(*)`.mapWith(Number) }).from(articleTable).where(whereClause),
      ]);
      results = items;
      totalCount = countResult[0].count;
      hasMorePages = skip + limit < totalCount;
    } else {
      // Ranked ids from the full-text/ILIKE query, hydrated into cards in one
      // further round trip so the rows render identically to every other listing.
      const rankedIds = ranked.map(result => result.id);
      const rows = rankedIds.length
        ? await db.query.article.findMany({
            where: and(publicFeedWhere(), sql`${articleTable.id} IN (${sql.join(rankedIds.map(id => sql`${id}`), sql`, `)})`),
            columns: ARTICLE_CARD_COLUMNS,
            with: ARTICLE_CARD_WITH_TAGS_WITH,
          })
        : [];
      const byId = new Map(rows.map(row => [row.id, row]));
      results = rankedIds
        .map(id => byId.get(id))
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
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
