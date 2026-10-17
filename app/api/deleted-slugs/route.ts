// ─────────────────────────────────────────────────────────────────────────────
// Deleted-slug manifest: how the edge learns about runtime tombstones
// ─────────────────────────────────────────────────────────────────────────────
//
// The middleware answers 410 Gone for permanently deleted article
// slugs without touching Neon PostgreSQL. The compiled-in half of
// the registry (lib/deleted-slugs.ts) covers every slug known at
// build time; this endpoint is how slugs deleted from the dashboard
// since the last deploy reach the edge.
//
// The body is a flat JSON list of slugs, served through the same
// unstable_cache tombstone entry the article pages use
// (lib/tombstones.ts), so the database is queried at most once per
// cache window no matter how often crawlers ask. The response is
// also HTTP-cached at the CDN (`s-maxage`), and the middleware keeps
// an in-memory copy for a short TTL, so a busy edge location makes
// this request a handful of times per minute at most — never once
// per article view.
//
// Slugs only, no titles or metadata: the endpoint is public, and a
// deleted article's URL is already public knowledge — its content
// is not.
// ─────────────────────────────────────────────────────────────────────────────

import { getDeletedSlugs } from "@/lib/tombstones";

export const dynamic = "force-dynamic";

export async function GET() {
  let slugs: string[] = [];
  try {
    slugs = await getDeletedSlugs();
  } catch (error) {
    // Fail closed to an empty list: a registry that cannot be read
    // must not take the article route down with it. The middleware
    // treats an empty manifest as "no dynamic tombstones" and keeps
    // answering from its compiled-in half.
    console.error("[deleted-slugs] manifest read failed:", error);
  }

  return new Response(JSON.stringify({ slugs }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // The middleware caches the manifest in memory for half of
      // this window, so the CDN copy is allowed to be a little
      // stale: a freshly deleted slug starts answering 410 within
      // a minute or two of the deletion, and every crawl in
      // between gets the previous manifest — still a 404 from the
      // origin, which is exactly the behaviour being replaced.
      "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
