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

## 5. Task log

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
