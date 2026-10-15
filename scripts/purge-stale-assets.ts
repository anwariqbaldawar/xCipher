#!/usr/bin/env tsx
/**
 * Purge stale / irrelevant image references.
 *
 * Why this exists: an unrelated placeholder PNG (a "Homenest Movers" truck) was
 * surfacing in Google Images attached to the xSypher homepage. The file is not
 * in this repository and never has been, so the reference lived in data, not in
 * code — most likely an `Article.img` / `Article.ogImage` value, or the
 * editable `PublicationSettings.defaultOgImage`.
 *
 * `lib/stale-assets.ts` already refuses to *publish* such a value (that guard
 * protects the rendered page immediately). This script removes the value from
 * the database so the guard has nothing left to catch, and reports what it
 * found so the source of the bad URL can be traced.
 *
 *   Dry run (default — prints what it would change):
 *     npx tsx scripts/purge-stale-assets.ts
 *
 *   Apply:
 *     npx tsx scripts/purge-stale-assets.ts --apply
 *
 *   `DATABASE_URL` and `NEXT_PUBLIC_R2_PUBLIC_BASE` are read from `.env` in the
 *   working directory — the script loads it itself, because a bare `tsx`
 *   process does not get it the way `next dev` / `next build` do.
 *
 * Exit codes: 0 = success (including "nothing to do"), 1 = failure. A failed
 * run must never look like a successful one in CI (AGENTS.md §6).
 */

import "dotenv/config";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { and, isNotNull, ne, or, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { article, publicationSettings } from "../lib/db/schema";
import { STALE_ASSET_PATTERNS, isStaleAsset } from "../lib/stale-assets";

const APPLY = process.argv.includes("--apply");
const PUBLIC_DIR = path.join(process.cwd(), "public");
/** Trimmed once: the comparison below must not depend on a trailing slash. */
const R2_PUBLIC_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE || "").replace(/\/+$/, "");

/**
 * Which bucket a stored image value falls into.
 *
 * `own` is anything the publication actually controls (an R2 upload or a file
 * in `public/`). Everything else is a leftover from a previous storage era and
 * is reported — never rewritten, because choosing replacement artwork is an
 * editorial decision, not a migration step.
 */
function classifyStoredImage(value: string | null | undefined) {
  const v = value?.trim();
  if (!v) return "empty" as const;
  if (isStaleAsset(v)) return "stale" as const;
  if (v.startsWith("/")) return "own" as const;
  if (R2_PUBLIC_BASE && v.startsWith(R2_PUBLIC_BASE)) return "own" as const;
  // A bare photo id is the pre-R2 format: `lib/image-url.ts` still expands it
  // so the card keeps its own image, which is exactly why it must be listed.
  if (/^\d+$/.test(v)) return "legacy-pexels" as const;
  if (/^https?:\/\//i.test(v)) return "external" as const;
  return "unservable" as const;
}

async function reportAndPurgeArticles() {
  // Deliberately not a SQL LIKE filter: the predicate that decides what the
  // renderers refuse to publish lives in lib/stale-assets.ts, and duplicating
  // it here in SQL would let the two drift. Only rows that carry an image at
  // all are read, and both columns are then checked with the real predicate.
  const rows = await db.select({
    id: article.id,
    slug: article.slug,
    title: article.title,
    img: article.img,
    ogImage: article.ogImage,
  })
    .from(article)
    .where(or(isNotNull(article.img), isNotNull(article.ogImage)));

  const hits = rows.filter(row => isStaleAsset(row.img) || isStaleAsset(row.ogImage));

  if (!hits.length) {
    console.log("[purge] articles: no stale image references found.");
    return 0;
  }

  for (const hit of hits) {
    console.log(`[purge] article "${hit.slug}" (${hit.title})`);
    if (isStaleAsset(hit.img)) console.log(`        img      → ${hit.img}`);
    if (isStaleAsset(hit.ogImage)) console.log(`        ogImage  → ${hit.ogImage}`);
    if (APPLY) {
      await db.update(article).set({
        ...(isStaleAsset(hit.img) ? { img: null } : {}),
        ...(isStaleAsset(hit.ogImage) ? { ogImage: null } : {}),
      }).where(sql`${article.id} = ${hit.id}`);
    }
  }

  console.log(`[purge] articles: ${hits.length} cleared${APPLY ? "" : " (dry run — pass --apply to write)"}.`);
  return hits.length;
}

async function reportAndPurgeSettings() {
  const [row] = await db.select({ defaultOgImage: publicationSettings.defaultOgImage })
    .from(publicationSettings)
    .where(and(isNotNull(publicationSettings.defaultOgImage), ne(publicationSettings.defaultOgImage, "")))
    .limit(1);

  if (!row?.defaultOgImage || !isStaleAsset(row.defaultOgImage)) {
    console.log("[purge] settings: default social image is clean.");
    return 0;
  }

  console.log(`[purge] settings.defaultOgImage → ${row.defaultOgImage}`);
  if (APPLY) {
    await db.update(publicationSettings).set({ defaultOgImage: null }).where(sql`${publicationSettings.id} = 'singleton'`);
  }
  console.log(`[purge] settings: 1 cleared${APPLY ? "" : " (dry run)"}.`);
  return 1;
}

/** Local files that should never have been committed as brand imagery. */
async function reportAndPurgePublicFiles() {
  let entries: string[] = [];
  try {
    entries = await readdir(PUBLIC_DIR);
  } catch {
    console.log("[purge] public/: directory not found, skipping.");
    return 0;
  }

  const stale: string[] = [];
  for (const entry of entries) {
    if (!isStaleAsset(entry)) continue;
    const full = path.join(PUBLIC_DIR, entry);
    const info = await stat(full).catch(() => null);
    // Never touch nested directories from a pattern match.
    if (!info?.isFile()) continue;
    stale.push(entry);
  }

  if (!stale.length) {
    console.log("[purge] public/: no stale assets on disk.");
    return 0;
  }

  for (const entry of stale) {
    console.log(`[purge] public/${entry}`);
    if (APPLY) await unlink(path.join(PUBLIC_DIR, entry));
  }
  console.log(`[purge] public/: ${stale.length} removed${APPLY ? "" : " (dry run)"}.`);
  return stale.length;
}

/**
 * Report-only: featured-image values that are not hosted by the publication.
 *
 * The purge above deletes values the renderers refuse. This section lists the
 * values they still *serve* but do not own — an external host, or a bare Pexels
 * photo id from before images moved to R2 — plus any value that is neither, in
 * which case the card is already showing the neutral cover instead. Nothing is
 * written: a non-empty list is simply the outstanding work on the image-ownership
 * migration, and the placeholder that originally surfaced in Google Images is
 * found by the purge above rather than here.
 */
async function reportNonOwnedImages() {
  const rows = await db.select({
    slug: article.slug,
    title: article.title,
    img: article.img,
    ogImage: article.ogImage,
  })
    .from(article)
    .where(or(isNotNull(article.img), isNotNull(article.ogImage)));

  const legacy: string[] = [];
  const external: string[] = [];
  const unservable: string[] = [];

  for (const row of rows) {
    for (const [field, value] of [["img", row.img], ["ogImage", row.ogImage]] as const) {
      const bucket = classifyStoredImage(value);
      const entry = `"${row.slug}".${field} → ${value}`;
      if (bucket === "legacy-pexels") legacy.push(entry);
      else if (bucket === "external") external.push(entry);
      else if (bucket === "unservable") unservable.push(entry);
    }
  }

  for (const [label, list] of [
    ["legacy Pexels id (still renders — migrate to R2)", legacy],
    ["external host (not owned by this site)", external],
    ["unservable (cards fall back to the neutral cover)", unservable],
  ] as const) {
    if (!list.length) continue;
    console.log(`[purge] ${list.length} ${label}:`);
    for (const entry of list.slice(0, 25)) console.log(`        ${entry}`);
    if (list.length > 25) console.log(`        … and ${list.length - 25} more`);
  }

  const total = legacy.length + external.length + unservable.length;
  console.log(total
    ? `[purge] non-owned images: ${total} (report only — nothing was modified).`
    : "[purge] non-owned images: none — every featured image is site-owned.");
}

async function main() {
  console.log(`[purge] stale asset patterns: ${STALE_ASSET_PATTERNS.join(", ")}`);
  console.log(`[purge] mode: ${APPLY ? "APPLY" : "DRY RUN"}`);

  const found = await reportAndPurgeArticles();
  const settingsHits = await reportAndPurgeSettings();
  const fileHits = await reportAndPurgePublicFiles();
  await reportNonOwnedImages();

  const total = found + settingsHits + fileHits;
  console.log(total
    ? `[purge] done — ${total} stale reference(s) ${APPLY ? "purged" : "would be purged"}.`
    : "[purge] done — nothing stale anywhere.");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("[purge] FAILED — nothing was left half-applied silently:", error);
    process.exit(1);
  });
