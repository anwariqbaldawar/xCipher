import { NextRequest, NextResponse } from "next/server";
import { searchArticlesLive } from "@/lib/search";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { MAX_QUERY_LENGTH, MIN_LIVE_QUERY_LENGTH, normalizeQuery } from "@/lib/search-query";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search?q=graph&limit=8
//
// The live-search endpoint behind the search-as-you-type dropdown.
//
// A route handler rather than a Server Action, for three reasons that matter on
// every keystroke:
//   1. Server Actions are serialised by React and invalidate the router cache,
//      which is measurable overhead on a request that fires every ~200ms.
//   2. GET is cancellable — the client aborts the previous request with an
//      AbortController when the reader types another character. A Server Action
//      cannot be aborted, so stale keystrokes keep arriving and can land after
//      the newest one.
//   3. GET responses can carry cache headers, so identical queries served from
//      the same edge node never reach Postgres twice.
// ─────────────────────────────────────────────────────────────────────────────

/** Never statically analysed or cached at build time; each query is per-reader. */
export const dynamic = "force-dynamic";

/** Requests allowed per IP per minute. Generous enough to type a sentence. */
const RATE_LIMIT = { limit: 90, windowMs: 60_000 };

function emptyResponse(query: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { query, results: [], count: 0, took: 0, ...extra },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const query = normalizeQuery(rawQuery);

  // Below the minimum there is nothing to search for. Answered without touching
  // the database or the rate limiter: the client shows its "keep typing" state.
  if (query.length < MIN_LIVE_QUERY_LENGTH) {
    return emptyResponse(query, { tooShort: true });
  }

  const requestedLimit = Number(searchParams.get("limit") ?? "8");
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 40)
    : 8;

  const ip = getClientIp(request.headers);
  const rate = await checkRateLimit("search:live", ip, RATE_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json(
      { query: query.slice(0, MAX_QUERY_LENGTH), results: [], count: 0, error: "rate_limited" },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
    );
  }

  const startedAt = Date.now();
  try {
    const results = await searchArticlesLive(query, { limit });
    return NextResponse.json(
      {
        query,
        results,
        count: results.length,
        took: Date.now() - startedAt,
      },
      {
        headers: {
          // Short edge cache: a phrase typed by one reader is usually typed by
          // the next, and the response is identical for everyone.
          "Cache-Control": "public, max-age=0, s-maxage=20, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("[api/search] live search failed:", error);
    return NextResponse.json(
      { query, results: [], count: 0, error: "search_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
