# xSypher - Product Requirements Document (PRD)

## 1. Project Overview
xSypher is a premium editorial newsroom CMS and publication built with modern web technologies (Next.js, Cloudflare Workers, Supabase PostgreSQL, Drizzle ORM).

## 2. Goals & Objectives
* Provide a high-performance, edge-rendered reading experience.
* Offer a robust editorial CMS for authors and editors.
* Maintain a secure, scalable, and cost-effective infrastructure.

## 3. Scope & Features
* **Authentication**: NextAuth (v5) with Drizzle adapter.
* **Database**: Neon/Supabase PostgreSQL for metadata; Cloudflare R2 for heavy content.
* **Content Management**: TipTap-based rich text editor with custom node extensions.
* **Styling**: Tailwind CSS + Vanilla CSS Variables (Dark mode, glassmorphism).

## 4. Current Tasks / Roadmap
* [x] Task 1 — article-owned images on every route (SEO / image-context fix).
* [x] Task 2 — live instant search with glassmorphism overlay.
* [x] Task 3 — permanent mobile Mermaid/SVG diagram fix (editor + article page).
* [x] Task 4 — follow-up hardening: article-page hero position, live-search SQL aliases,
      r2.dev image passthrough, Neon WebSocket/pooler configuration, and the mobile
      dismissal + history trap for the search overlay.
* [ ] Task 5 — purge stale asset references from live rows (`scripts/purge-stale-assets.ts --apply`; needs `DATABASE_URL`),
      and confirm `lib/search.ts` full-text uses `Article_search_idx` via `EXPLAIN ANALYZE`.
      (The second half is moot after Task 10: live search issues no SQL, so there is no plan to
      analyse; the index itself is no longer on any read path and can be reviewed for removal.)
* [x] Task 6 — identity pass: replace the enterprise/roleplay copy on the transparency report,
      the advertising page and the surrounding trust surfaces with the voice of an independent,
      founder-led engineering publication, and make About / Footer / contact / corrections /
      careers / media kit tell the same story.
* [x] Task 7 — ghost test data: purge it from the database and the R2 bucket, and fix the
      deletion pipeline that let it survive (asset purge, cache invalidation, real 404s).
      The `--apply` run itself needs the live database and bucket.
* [x] Task 9 — UI/UX refinements: desktop smart-scroll header on article pages, unboxed
      article hero, live-search modal fixes (no shortcut hints, close on navigation,
      red-text match highlighting incl. author names, no match badges, distinct
      Clear/Close), monetization-friendly editorial copy, the 6-profile social set
      (with Reddit) in strict order, and system-aware theme synchronisation.
* [x] Task 10 — zero-database-wakeup caching layer: live search answers from an in-memory
      snapshot of published stories, every public read is cached under structured tags, and
      Neon is only touched when new content is actually published. Compute that used to be
      held awake by keystrokes, crawls and page views is now allowed to suspend.

## 5. Task log

### Task 10 — zero-database-wakeup caching layer

**The cost being attacked.** Neon bills compute in CU-hours and suspends a project only
after roughly five idle minutes. A site that is read all day and edited a few times a day
therefore pays for two very different things: the seconds an editor spends writing, and
the wake-ups a crawler, a page view or an open search box triggers. The work below removes
the second category from the public read path entirely, and keeps the first: publishing and
editing still invalidate the affected caches immediately, and only then does the compute
have to be warm.

**Live search no longer queries at all (Task 1).** `lib/search.ts` used to issue one
`LEFT JOIN LATERAL` statement per keystroke. It now reads a snapshot:
`lib/cached-queries.ts::getPublishedSearchIndex()` runs a single lightweight query over
`PUBLISHED` stories (title, slug, deck, category, author, dates, tags, views, reading time,
a capped slice of the body text, and the R2 key) under
`tags: ["search-index", "articles"], revalidate: 86400`, and `lib/search-index.ts` filters,
scores and ranks it in memory. The new ranker is a transcription of the old `CASE` ladder —
exact title 100, title prefix 80, title contains 65, slug 50, tag 40, deck 30,
section/author 22, body 14, plus the full-text fraction and a views bonus capped at 5 — with
the same `ORDER BY` (score, then `publishedAt DESC NULLS LAST`, then `id ASC`) and the same
40-row ceiling, so results and the "See all results" pager are unchanged. The response
contract (`{ query, results, count, took }`, `matchField`/`matchLabel`/`matchedTags`/`score`,
anonymity masking, resolved R2 thumbnails) is untouched; it is simply answered in
microseconds from an array that is already in the process. A small process-local memo
(`lib/search-index-memory.ts`, a `Map` with a 15 s window, dropped by `lib/revalidate.ts`)
keeps even the data-cache read off the keystroke path.

**Public reads are cached, the right things stay dynamic (Task 2).** Homepage, article,
category, tag, author, latest, `feed.xml`, `sitemap.xml` and both sitemap children read
through `unstable_cache` with structured tags, so a warm request never reaches the pool.
Two details matter more than the wrapping itself. Failure paths are kept *outside* the
cached callbacks — a caught error returning `[]` would otherwise be frozen for the whole
window, which is exactly how a cold database becomes a blank homepage for an hour. And
every date is normalised to an ISO string inside the callback and rehydrated at the edge of
the route, because the data cache round-trips through JSON and a `Date` would come back as
a string on a hit and an object on a miss. The sitemap index and its children moved from
`force-dynamic` to an hourly cache, so crawlers no longer wake the compute to be told
nothing changed; the news sitemap keeps its fallback to the latest ten stories when the
48-hour window is empty.

**The quiet wake-ups (Task 3).** Three unrelated pieces of traffic were keeping the compute
alive:

* the view counter. A view is now gated on a real browser (`lib/bot-detection.ts`: search
  engines, social unfurlers, AI crawlers, uptime monitors, `curl`/`python-requests`/HTTP
  clients, and a missing user agent all count as machines), then rate-limited, then
  buffered in Redis — and when Redis is unavailable the view is **dropped** with a single
  process-wide warning rather than falling back to a synchronous `UPDATE`. Losing a view is
  cheaper than paying for a wake-up;
* the connection pool. `lib/db.ts` now keys its pool by connection string on `globalThis`
  (a dev reload can no longer leak a socket per edit) and releases idle connections after
  ten seconds, so Neon can actually reach its suspend window instead of being held awake by
  an idle TCP session;
* the health endpoint. `/api/health` probes Postgres at most once per five minutes
  (`lib/db-health.ts`, `HEALTH_DB_PROBE_MS`); a thirty-second uptime monitor now costs one
  query per five minutes, and a failing probe is never cached, so an outage cannot be
  reported as healthy.

**Invalidation reaches everything cached (Task 4).** Article saves, status transitions,
scheduled publication, deletion, taxonomy renames, author/profile edits and comment
moderation all fan out through `revalidateTag`/`revalidatePath` in `lib/revalidate.ts`,
which also drops the search memo — so a publish, edit or delete is visible on the site, in
the feeds, in the sitemaps and in live search immediately, with no timer to wait for.
Taxonomy mutations invalidate both the old and the new slug, and merge operations
invalidate source and target.

**Verification.** `npx tsc --noEmit` clean; `npx vitest run` green at 67 files / 798 tests,
including a new `tests/zero-db-search.test.ts` whose `@/lib/db` mock throws on any property
access, so a future change that reintroduces a query in the search path fails the suite
instead of the invoice. `next build` succeeds and its route table is *identical* to the
commit before this work except for the three sitemap endpoints, which changed from dynamic
to hourly-cached — the intended difference.

**Limits of this run.** There is no live Neon, Redis or R2 in the build environment, so the
wake-up trace is structural — every statement reachable from reader traffic was enumerated
and is behind a cache, a memo, a bot gate or a Redis buffer, and the search path is proven
query-free by test — rather than a measured `pg_stat_statements` diff. Two Task 5 items from
the earlier roadmap still need the live database for the same reason: the
`scripts/purge-stale-assets.ts --apply` sweep and the `EXPLAIN ANALYZE` confirmation for
`Article_search_idx`. The build also needed the three `next/font/google` families replaced
with a local stand-in, because this environment cannot reach `fonts.googleapis.com`; that
shim is a sandbox-only patch and is not part of the commit.

### Task 9 — UI/UX refinements, search modal, social set, theme sync
Six workstreams, each inspected in the live components before editing:

**Desktop header on article pages.** `SiteHeader` ran the mobile 3-tier collapse on article
pages at every width and a `min-width:768px` CSS override then forced all rows visible, so
desktop articles never got the homepage's utility-bar behaviour. The scroll handler now
branches on `matchMedia("(min-width: 768px)")` (re-evaluated on resize): desktop articles —
like every listing page — toggle only Row 1 (hide on scroll down, return on slight scroll
up), while Rows 2/3 stay pinned. Below 768px the article behaviour is byte-for-byte the old
progressive collapse; mobile was not touched. The CSS override now force-pins only
`.hdr-row-2`/`.hdr-row-3` on desktop article pages.

**Article hero.** The featured `<figure>` lost its `border`/`overflow-hidden`/rounded card
wrapper and the caption's box padding — the image and caption now sit directly in the
column (`.art-hero .ph` keeps the image's own rounding). `data-image-role="featured"` and
the preload/fetchPriority behaviour are unchanged.

**Live search modal.** Removed the `⌘K` badge in the input and the `↑↓ / ↵ / esc` legend
bar (markup and CSS), match-type badges (`TITLE MATCH`, `AUTHOR MATCH`, …) next to the
category pill, and the red highlight pill: `.search-mark` is now brand-red bold text on a
transparent background, applied to the author name in the meta line as well as the title.
"See all results" now goes through the modal's close-then-navigate path (and any pathname
change closes the panel), fixing the modal staying open over `/search`. Clear became a
labelled eraser pill shown only while text is typed; Close is a distinct circular button
that fills accent-red on hover.

**Editorial copy.** The homepage/sidebar "How we work" cards, About promise 2,
Editorial Standards and Editorial Policy no longer claim payment for coverage is refused:
core reporting/benchmarks stay independent while clearly labelled Sponsored Deep-Dives,
Partner Content and display/newsletter sponsorships fund the publication (sponsorship
buys placement, never conclusions; no preview/veto). Editorial Policy is expanded to
executive-grade sections: Technical Verification & Benchmarking Methodology, Sponsored
Content & Native Advertising Disclosure, Affiliate & Partner Links, AI Assistance &
Human Engineering Review, and Corrections Protocol (two-business-day response). About's
metric strip: "2025 Founded & Independent" → "Independent — Engineering & Security
Publication", "Zero Sponsored Clickbait" → "100% Transparent & Labelled Partnerships".

**Social set.** New shared `components/common/SocialLinks.tsx` renders the six official
profiles in one strict order — Facebook, Threads, Instagram, LinkedIn, X, Reddit
(`https://www.reddit.com/r/xsypher/`, new tab, `noopener noreferrer`) — now used by the
footer, About CTA, Contact Desk and the mobile drawer. `SocialIcon` gained Threads and
Reddit glyphs; the Organization `sameAs` in `lib/entity-schema.ts` lists the same set.

**Theme sync.** `ThemeProvider` now sets the system-aware contract explicitly
(`defaultTheme="system"`, `enableSystem`, `enableColorScheme`, `data-theme` attribute):
first visit follows `prefers-color-scheme` with no FOUC (pre-paint script), OS changes
are followed live while no override is saved, and the header toggle stores an explicit
override (Shift-click returns to following the system).

Verified: `npx tsc --noEmit`, full `npx vitest run`, ESLint on touched files — see the
commit message. `tests/live-search-ui.test.tsx` gained no-hints / author-highlight /
see-all-closes / clear-action cases plus a red-text CSS contract;
`tests/site-header-headroom.test.ts` gained the desktop source contract;
new `tests/social-links.test.tsx` and `tests/theme-system.test.ts`.

### Task 7 — ghost test data: purge it everywhere, and fix what let it survive
Reported symptom: test articles deleted from the admin dashboard were still being found and
indexed by search engines and AI crawlers. The instruction was to inspect the actual pipeline
first rather than guess, and the inspection found four separate reasons the content outlived
the delete.

**1. Only the row was deleted.** `deleteArticlePermanently` removed the row, the reviews, the
revisions and the thumbnail, then scraped the content payload with two regexes —
`"src": "…"` in the JSON and `src="…"` in the HTML. A `srcset` candidate, a `data-src` lazy
image, a `<video poster>`, an inline `background-image: url(…)`, or an image referenced only
from a TipTap attribute that was not `src` was never deleted, and nothing else in the system
collects those keys: uploads are content-addressed per file and R2 has no idea an object is
unreferenced. `deleteOwnDraft` had the same scan. `bulkDelete` did no storage work at all, so
bulk-deleting a hundred archived test posts left a hundred content blobs and every image in
them.

**2. Cache invalidation covered three paths.** Homepage, `/article/<slug>` and `/sitemap.xml`.
`/latest`, the category, tag and author archives, the tag-keyed `unstable_cache` entries and
the RSS feed kept serving the deleted story until their own revalidate window expired — ten
minutes for an author page — and an edge that had already cached the HTML kept it
indefinitely.

**3. A deleted slug did not answer 404.** The article route's `generateMetadata` returned `{}`
for a missing or future-dated slug, so the URL answered with the homepage `<title>` and social
card while the body rendered the 404 boundary. That is the soft-404 shape a crawler treats as
"still there", and it is why the URLs stayed in the index.

**4. There was no offline cleanup surface.** `scripts/purge-stale-assets.ts` rewrites stale
*references* inside rows; nothing could find a row or a bucket object with no live reference at
all — which is the state the already-deleted fixtures are in, and the reference for the
placeholder truck image was nowhere in the repository (no seed script, no static JSON, no
`/public` asset), so it had to be a live row and a live object.

**What the deletion pipeline does now** (one helper per job, shared by all three delete paths
so they cannot drift apart again):

* `lib/article-assets.ts` — `collectArticleAssetKeys()` returns the bucket keys of the content
  blob, the featured image, the social image and every inline asset, read from the sanitized
  HTML (`src`, `data-src`, `data-original`, `data-lazy-src`, `srcset`, `data-srcset`,
  `poster`, `href`, `xlink:href`, `content`, CSS `url()` in inline styles and `<style>`
  blocks) and from the TipTap JSON walked as data at any depth (`src`, `href`, `url`,
  `srcset`, `poster`, `graphic`, `thumbnail`, `capture`). The content blob key is included even
  when the payload could not be read.
* `lib/storage.ts` — `r2KeyFromUrl()` normalises any stored reference (full public URL,
  root-relative path, bare key) to a bucket key and refuses anything not in the bucket;
  `deleteKeysFromR2()` deletes in S3 `DeleteObjects` batches of up to 1000 with per-key error
  parsing from the response XML and a one-by-one fallback (concurrency 8, a 404 counts as
  deleted); `listR2Objects()` pages `ListObjectsV2`.
* `lib/article-deletion.ts` — `purgeArticleAssets()` fetches the content payload with
  `no-store` (`fetchFromR2` caches for 300s, which would hide an image uploaded in the last
  five minutes), deletes the keys, then evicts the public URLs from the Cache API and — when
  `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_PURGE_API_TOKEN` are configured, now documented in
  `.env.example` — from the zone cache. It never throws: a storage failure is reported so the
  sweep can find the leftovers instead of blocking the delete.
  `revalidateArticleDeletion()` clears the article's cache tags and every public surface —
  `/`, `/latest`, `/search`, `/article/<slug>`, the category, author and tag archives,
  `/feed.xml`, `/rss.xml`, `/sitemap.xml`, `/sitemap/pages.xml`, `/sitemap/articles.xml`.
  `notifyIndexingOfDeletion()` reports `URL_DELETED` to the Google Indexing API, but only for a
  row that was actually published.
* Every delete path purges storage **before** the database delete, while the references still
  exist to be read, hard-deletes the relations and records `r2KeysRequested` / `r2KeysDeleted`
  in the audit row. `bulkDelete` now selects the full rows first, purges in windows of five and
  revalidates per row for anything that was published.
* `scripts/purge-ghost-content.ts` cleans up what is already out there. Dry run by default,
  two sweeps: the live database (fixture phrases such as "Tiptap Editor", "Ultimate Testing
  Document" and "Homenest", exact fixture slugs, `test-`/`dummy-`/`sample-`/`copy-of-`
  prefixes, and Roman Urdu, which needs at least two distinct whole-word markers before it is
  even reported) and the bucket (every object with no surviving reference in a row column or a
  content body of a row in *any* status, with a grace window so an upload in flight is never
  swept). `--apply --include-probable --match --slug --prefix --grace-days --concurrency
  --skip-db --skip-r2 --skip-content-scan`. Deleted rows take their objects and their
  revalidations with them. The classification is pure and tested, and split by how conclusive
  each signal is on its own: `confirmed` (fixture wording, a fixture slug, a fixture slug with
  a counter) can be deleted on; `probable` (a bare `test-` prefix, `copy-of-`, two Roman Urdu
  markers, "Hello World") is printed for a human, because
  `test-data-leaks-production` and `nvme-ssd-test` are slugs a real story can have.
* Crawlability, so a dead URL is a dead URL from the first response: the article route's
  `generateMetadata` throws `notFound()` for a missing or future-dated slug instead of
  returning empty metadata (a renamed slug still redirects, marked `noindex`);
  `app/(public)/not-found.tsx` has its own title and robots metadata instead of inheriting the
  homepage title; the preview route no longer hands an unpublished draft's headline and deck
  to an anonymous request; and `getRecentArticleSlugs()` no longer pre-builds scheduled
  articles that would immediately 404.
* `lib/db.ts` gives the driver `ws`, explicitly. An earlier pass here removed `ws` and
  assigned `globalThis.WebSocket` instead, reasoning that Node 22's built-in WebSocket is a
  compliant implementation. It is not: it constructs, but the connection to the Neon proxy never
  opens, and the driver turns that into a bare `ErrorEvent { type: "error" }` with no Postgres
  message. Every query rejected — `next dev` rendered empty listings, `next build` failed
  prerendering article pages, and `scripts/purge-ghost-content.ts` died on its first `SELECT`;
  in the app the same failure surfaced as "Only plain objects … can be passed to Client
  Components", because Next tried to serialise that ErrorEvent across the server/client
  boundary. `ws` (plus `@types/ws`) is back in `package.json`, the constructor is assigned from
  it when nothing else has claimed it, and `tests/backend-runtime.test.ts` now asserts the
  constructor *is* `ws` rather than merely being a function.
* The two operator scripts load `.env` themselves (`import "dotenv/config"`). `next dev` and
  `next build` read it for the app; a bare `tsx` process does not, which is why
  `npx tsx scripts/purge-ghost-content.ts` used to fail with `DATABASE_URL is not set` before it
  could even print the dry-run report.

Verified in this repository: `npx tsc --noEmit`, `npx eslint` clean on every new module,
`npx vitest run` (61 files / 733 tests; the two new suites pin the false-positive side of both
destructive decisions) and `npx next build`.

Not verifiable here: this environment has no database and no R2 bucket, so
`scripts/purge-ghost-content.ts --apply` and the live deletion path have to be run against the
real bucket. Run the sweep as a dry run first; it prints the fixture rows, their evidence and
the orphan list before anything is deleted.

**Hardening pass (follow-up commit).** The pipeline above was reviewed against the failure it
is meant to prevent, and five gaps were closed:

* The purge only ever considered the article namespace. `lib/article-assets.ts` now declares
  `ARTICLE_ASSET_PREFIXES = ["xsypher/articles/", "articles/"]` and `isArticleAssetKey()`, and
  every candidate — including a bare, non-URL TipTap attribute value such as `"left"`, which
  the JSON walker legitimately returns — passes through one `add()` that drops anything outside
  the namespace. A shared brand asset (logo, default social card, author avatar) can therefore
  never be deleted because it appeared in one body. `scripts/purge-ghost-content.ts` filters on
  the same prefix list and adds `--force-any-prefix` for a bucket organised differently.
* Revisions can point at a content blob the article no longer does: `ArticleRevision.contentUrl`
  is a snapshot from the moment it was saved. `app/actions/workflow.ts` reads them before the
  cascade (`revisionContentKeysByArticle()`) and passes them in as
  `purgeArticleAssets(article, { extraReferences })`, and the offline sweep resolves revision
  URLs the same way, so restore history cannot strand a blob.
* An unreadable payload used to look exactly like a clean delete. `purgeArticleAssets()` reports
  it, the script counts bodies it could not read, and refuses `--apply` without
  `--force-orphans` (and refuses `--apply --skip-content-scan` outright) so a skipped scan is
  never mistaken for a completed purge.
* A status change invalidated `/sitemap.xml` only, while `/feed.xml` and `/sitemap/pages.xml` are
  cached for an hour and read the article table directly — archiving a story left it in both.
  The list now lives in one exported constant (`SYNDICATION_PATHS` in `lib/article-deletion.ts`)
  shared by the transition path and every delete path.
* Ghost classification was eager and narrow at once. Fixture slug prefixes such as `test-` and
  the phrase "hello world" moved to a separate weak tier that is reported but never deleted
  (`GHOST_SLUG_WEAK_PREFIXES`, `GHOST_WEAK_PHRASES`), so a real story like
  `test-data-leaks-production` survives the sweep, while the confirmed fixture wording remains
  deletable. `lib/article-deletion.ts` also stopped importing the Google Indexing queue at
  module scope — it is a dynamic import inside `notifyIndexingOfDeletion()`, so the offline
  script can import the module without opening a Redis connection.

Verified after the pass: `npx tsc --noEmit`, `npx eslint` clean on the touched files, and
`npx vitest run` — 62 files / 742 tests, including a new `tests/article-deletion.test.ts` that
asserts the `DeleteObjects` body carries the content blob, the featured and social images and
the inline keys, and that a refused batch still reports per-key failures instead of claiming
success.

**Regression fix (same task, integration-tested on a real database).** Two things the sandbox
could not catch, found by running `next dev`, `next build` and the scripts against the real
database:

1. **The driver must be given `ws`.** Removing it (see the `lib/db.ts` note above) traded a
   dependency for a broken database layer. Node's built-in WebSocket is not a drop-in for the
   Neon proxy: it constructs, the handshake never completes, and the driver reports only
   `ErrorEvent { type: "error" }`. `ws` and `@types/ws` are back, the constructor is assigned
   from `ws`, and the runtime test asserts identity with `ws` rather than "is a function".
2. **The operator scripts never loaded `.env`.** `next dev` and `next build` load it for the
   app; a bare `tsx` process does not, so
   `npx tsx scripts/purge-ghost-content.ts` exited with `Error: DATABASE_URL is not set` before
   it could print the dry-run report. Both purge scripts now start with
   `import "dotenv/config"` (declared as a devDependency, so it does not rely on a transitive
   copy).

### Task 6 — independent-publication identity and cross-site consistency
The policy pages were written in the voice of an organisation xSypher is not: a
surveillance-resistant newsroom with a legal desk, a revenue split and a subpoena
counter. None of it was true, and all of it was checkable — a publication that
invents a warrant canary has no answer when a reader asks who funds it. So the
fiction was removed and replaced with the facts a small publication can be held to.

Removed everywhere: the FISA-court / national-security-letter / subpoena ledger and its
warrant-canary framing, law-enforcement and wiretap request sections, the reader
subscription and enterprise-licensing revenue split, inflated headcount and bureau
claims, the enterprise media kit ($5k–$50k minimums, monthly impression figures), the
careers page's "elite stipend / unlimited PTO" package, and the hosted PGP-key and
SecureDrop claims (no such material exists in this repository).

What the transparency report now states instead: independent, founder-led and
bootstrapped ownership with no venture capital and no corporate parent, and what that
buys a reader (benchmarks, architecture breakdowns and reviews cannot be bought);
the research pipeline (primary documentation, reproducible testing, editor review
before publication); the AI policy (assistive use only — the thesis, the fact-checking
and the verdict are human); the advertising and affiliate firewall (labelled
sponsorships, no sold do-follow links, declined categories, no editorial control);
a corrections, copyright and takedown policy with response targets (2 business days
for a factual error, 1 for a security correction, 3 for attribution, 5 for a copyright
complaint or retraction request) and the reasoning for keeping corrections on the
article instead of in a separate log; and a plain-language reader-data section.

The advertising page dropped its price tiers and impression counts for the audience it
actually reaches (full-stack developers, architects, security and AI practitioners,
engineering students), three formats without price tags — dedicated technical deep-dive
or product review, category/article banner sponsorship, and early-partner custom
packages — six sponsor guidelines including the declined categories, and a four-step
process that ends in the existing contact form (`partnerships`).

Consistency pass over the surrounding surfaces: About (founder credit, no chart, no
staff-count claims, funding link), media kit (boilerplate, both word counts, founder
bio), editorial policy and editorial standards (funding, affiliate, AI, and source
protection now says an encrypted channel is available on request rather than implying
a drop box), contact (department text, and a clear statement that no secure drop is
operated), corrections (copyright and attribution section), careers, the newsletter
page, the series index, the Sidebar "how we work" card, the mobile drawer and the
footer links. Every route and fragment the rewritten pages link to was checked against
the routes that exist, including `#firewall` and `#corrections` on `/page/transparency`.

Verified in this repository: `npx tsc --noEmit`, `npx eslint` on every changed file
(no new findings; the four remaining errors in these files are pre-existing lines in
`Sidebar.tsx`, `MobileDrawer.tsx`, `NewsletterPageForm.tsx` and `privacy-policy`),
`npx vitest run` (59 files / 698 tests) and `npx next build`. The production build
confirms the static/dynamic split of the policy routes is unchanged (about, advertising,
contact, corrections and transparency stay `force-static`; the rest were already dynamic
because `app/(public)/layout.tsx` reads the CSP nonce from `headers()`).

Not verified here: how the pages look on a real handset, and the "Last reviewed" dates
are editorial placeholders to be re-stamped at release.

### Task 3 — mobile Mermaid/SVG diagram fix
Reported symptom: label text inside flowchart boxes overflowed, clipped or refused to
wrap on a Galaxy S24 Ultra / Android WebView while desktop Firefox responsive mode
looked correct.

Three independent causes, each fixed at its own layer:

1. **Measurement before fonts.** `lib/mermaid-fonts.ts` (`waitForMermaidFonts` →
   `document.fonts.load` for 400/700/italic, then `document.fonts.ready`, then a double
   `requestAnimationFrame`) runs inside `lib/mermaid-render.ts` before every render, for
   the editor and the article page alike. A font that finishes *after* a diagram was
   drawn triggers exactly one re-render (`lib/use-mermaid-render.ts`), and a resize of
   8px or more re-renders too (orientation change, sidebar, editor resize rail).
2. **One config for both renderers.** `lib/mermaid-config.ts` is now the only
   `mermaid.initialize()` argument in the codebase: flowchart `look: "classic"`
   (the neo renderer ignores `flowchart.padding` entirely — measured 153.55x43.5 at
   padding 20 *and* at padding 60), `padding: 20`, `wrappingWidth: 190`,
   `nodeSpacing: 60`, `rankSpacing: 70`, `useMaxWidth: true`, root-level
   `htmlLabels: true` (`flowchart.htmlLabels` is deprecated in v12), and a px font size
   that the reader A−/A+ scaler cannot move.
3. **CSS isolation + a label box every engine clamps.** The wrapper, the SVG and every
   label are pinned (`font-size`, `line-height: 1.5` — the value Mermaid measures with,
   `text-size-adjust: 100%`, `white-space: normal`, `word-break: break-word`,
   `overflow-wrap: anywhere`), and Mermaid's shrink-to-fit `display: table-cell` label
   box is replaced with `display: block; width: max-content` under Mermaid's own inline
   `max-width`. That last rule is what makes a long label wrap *inside* its polygon
   instead of running past it, and it is emitted twice on purpose: from
   `themeCSS` inside the SVG, so it is already in force while Mermaid measures, and from
   `app/globals.css`, so the page cannot reflow the label afterwards.

Verified in this repository: `npx tsc --noEmit`, `npx eslint` on every changed file,
`npx vitest run` (59 files / 698 tests, including
`tests/mermaid-rendering.test.ts` and `tests/mermaid-measurement-css.test.ts`, which
renders through the real installed Mermaid and asserts that the wrapping rules are in
the DOM at the moment a label box is measured), and `npx next build`.

Not verified here (no browser and no database in this environment): the pixel result on
a physical Android device, and the live-data checks listed under Task 5.

### Task 4 — follow-up hardening (same change, one commit)
Five defects found while reviewing the two tasks above, fixed together so one pull
covers them.

1. **Article hero position.** `app/(public)/article/[slug]/page.tsx` drew the featured
   image between the headline and the deck. The header now reads kicker → headline →
   deck → byline and publication details → Listen/Comments bar → photograph, so the
   picture opens the story instead of standing between the headline and who wrote it.
   The figure still closes the `<header>`, and its crawler-facing contract is unchanged:
   `data-image-role="featured"`, `preload` (Next 16's replacement for the deprecated
   `priority`), `fetchPriority="high"`,
   `sizes="(max-width: 1024px) 100vw, 66vw"` and `IMAGE_WIDTHS.articleHero`.
2. **Live-search SQL referenced a table name that is aliased away.** `lib/search.ts`
   builds one statement (`FROM "Article" a`) but two clauses still said
   `"Article"."title"` / `"Article"."id"`, which Postgres rejects with 42P01
   (`invalid FROM-clause entry`) — the instant search would have answered 500 for every
   query that reached those branches. Both now use the alias `a`. Anything that reaches
   the database has to be checked against a real server; this one cannot be exercised in
   this environment at all, so the guard is a source contract in
   `tests/live-search-metadata.test.ts` (comments stripped, then no `"Article"."…"`
   reference may remain).
3. **`/cdn-cgi/image/…` on a base that cannot transform.** `lib/image-url.ts` emitted a
   Cloudflare transform URL for whatever `NEXT_PUBLIC_R2_PUBLIC_BASE` was configured.
   The `pub-….r2.dev` developer endpoint and the `…r2.cloudflarestorage.com` S3 API host
   are not Cloudflare zones, so that path is a key lookup that 404s — every card on a
   preview deployment would have been a broken image. `supportsImageTransformations()`
   now returns the stored URL untouched for those hosts (and for a base that does not
   parse), and the production custom domain keeps the sized `format=auto` variants.
4. **Neon driver hardening.** `lib/db.ts` now hands `@neondatabase/serverless` an
   explicit WebSocket constructor (`ws`), caps the pool at `POOL_MAX_CONNECTIONS = 5`,
   and rewrites a `.neon.tech` connection string onto its `-pooler` hostname
   (`withNeonPooler()`, skipped when already pooled, disabled with `NEON_POOLER=off`).
   This is hardening, not a proven fix: Node 22 already exposes a global `WebSocket`, so
   the driver may well have been finding one. What the rewrite does fix concretely is
   connection fan-out — one long-lived backend connection per pool per process is what
   exhausts a small compute during a build.
5. **Mobile dismissal and the history trap in the search overlay.** A phone has no Esc
   key and the sheet fills the viewport, so the desktop affordances were all out of
   reach. `components/search/SearchOverlay.tsx` now renders a labelled `search-close`
   control (44x44 CSS px on touch, 34 on pointer), a tap on the empty part of the result
   list dismisses the panel, and opening pushes one `{ searchOpen: true }` history entry
   — carrying Next's own state — so a system Back or back-swipe closes the search rather
   than leaving the story. The entry is spent again on every other close path
   (`history.back()`, or an in-place `replaceState` when a route change follows, which
   would otherwise race `router.push`). Both behaviours, and the stylesheet contract for
   the new control, are pinned in `tests/live-search-ui.test.tsx`.

### Task 2 — live instant search
`/search` plus the ⌘K overlay now query `app/api/search/route.ts` as you type
(200 ms debounce, 2-character minimum, 90 req/min/IP, `s-maxage=20`) instead of
round-tripping a server action. Ranking is one `dbRead` with a `LEFT JOIN LATERAL` for
tags: exact title > title prefix > title > slug > tag > deck > category/author > body,
plus `ts_rank` and a capped views tie-breaker. The overlay is a real listbox
(`role="option"`, `aria-activedescendant`, wrap-around arrows, Esc/backdrop close) and
its glass panel is a CSS `visibility` toggle, so closed means closed for the tab order
as well as for the eye.

### Task 1 — article-owned images on every route
Featured images, `og:image`, `twitter:image`, JSON-LD `image`, sitemap image entries and
RSS enclosures all resolve through one ladder (`lib/image-url.ts`), so a page can only
present an image that belongs to the story it describes: R2-hosted assets get a sized
`/cdn-cgi/image/...` variant, archives (home, category, tag, latest) and author pages
declare the brand banner or the author avatar only, and anything unrecognised falls back
to the neutral cover. `lib/stale-assets.ts` refuses the retired placeholder family
(`homenest`, `movers`, `logo-4-squares`, `placeholder-cover`, `dummy-image`,
`sample-image`, `lorem-ipsum`) everywhere an image URL is resolved.
`scripts/purge-stale-assets.ts` is a dry-run-by-default sweep for rows that still hold
one of those values; it needs `DATABASE_URL`, so it has not been run from here.

Decision kept on purpose: the legacy bare-id → Pexels expansion in `lib/utils.ts`
(`getImgSrc`) and `lib/mockData.ts` itself. `getImgSrc` has exactly one live caller
(`lib/image-url.ts`, after the stale filter), and removing the expansion would blank the
featured image of any legacy row that stored a bare numeric id.
