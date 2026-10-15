#!/usr/bin/env tsx
/**
 * Purge ghost test content: database rows and orphaned R2 objects.
 *
 * Why this exists: a fixture post ("Tiptap Editor: Ultimate Testing Document",
 * a Roman Urdu draft, a post carrying the "Homenest Movers" truck image) was
 * deleted from the dashboard, but clusters of it survived — the article page was
 * already in the index, the content blob and its images were still in R2, and
 * nothing in the app could ever have found them again. Deleting the row is not
 * deleting the article.
 *
 * Two sweeps, both dry-run by default:
 *
 *   1. DB — every article row (any status, because a test post that reached
 *      PUBLISHED is precisely the case that gets indexed) is classified by
 *      `lib/ghost-content.ts`. Rows that match are printed with the evidence,
 *      then — only with `--apply` — stripped of their R2 objects and hard
 *      deleted from the database.
 *
 *   2. R2 — the bucket is listed and compared against every reference the
 *      database and surviving content bodies still make. Objects nothing points
 *      at are orphans: the media of articles deleted before this pipeline
 *      existed, replaced featured images, uploads whose save never landed.
 *
 *   Dry run (default — prints what it would delete):
 *     npx tsx scripts/purge-ghost-content.ts
 *
 *   Apply:
 *     npx tsx scripts/purge-ghost-content.ts --apply
 *
 *   Also remove "probable" matches (Roman Urdu markers — read the list first):
 *     npx tsx scripts/purge-ghost-content.ts --apply --include-probable
 *
 *   Narrow the bucket sweep to one namespace, or widen the grace window:
 *     npx tsx scripts/purge-ghost-content.ts --prefix xsypher/articles/ --grace-days 14
 *
 *   Add your own fixture names (repeatable):
 *     npx tsx scripts/purge-ghost-content.ts --match "homepage demo" --slug roman-urdu-test
 *
 * Notes for the operator:
 *   • `DATABASE_URL` and the R2 credentials are read from `.env` in the working
 *     directory. A bare `tsx` process does not get that for free the way
 *     `next dev` / `next build` do, so the script loads it itself.
 *   • This script cannot invalidate the site's ISR cache — Next.js only exposes
 *     revalidation inside a request. Delete from the admin dashboard when you
 *     need the 404 to be instant; after running this, the public caches also
 *     self-heal inside their own windows (article 3600s, listings 180–300s), and
 *     a redeploy clears them outright.
 *   • Rows are hard deleted. There is no soft-delete column in this schema and
 *     none is simulated here.
 *   • The orphan sweep refuses to delete anything it cannot fully reason about.
 *     Inline media is only visible inside the content bodies, so `--apply` stops
 *     (exit 1) if `--skip-content-scan` is set or if any body could not be read —
 *     in either case an image that a live article still uses looks unreferenced.
 *     `--force-orphans` overrides that, and the only good reason to pass it is a
 *     bucket whose bodies are known to be unreachable.
 *   • Deletion candidates are limited to the article namespaces the pipeline
 *     writes (`xsypher/articles/`, `articles/`). An article body can reference
 *     any URL in the bucket, and "an article mentions it" is not "the article
 *     owns it" — deleting a shared brand asset because one story embedded it
 *     would break every other page. `--force-any-prefix` lifts that limit for an
 *     operator who has listed a prefix outside those namespaces on purpose.
 *
 * Exit codes: 0 = success (including "nothing to do"), 1 = failure. A failed run
 * must never look like a successful one in CI (AGENTS.md §6).
 */

import "dotenv/config";
import { inArray, eq, isNotNull } from "drizzle-orm";
import { db } from "../lib/db";
import {
  article,
  articleReview,
  articleRevision,
  auditLog,
  author,
  comment,
  publicationSettings,
} from "../lib/db/schema";
import { collectArticleAssetKeys, isArticleAssetKey } from "../lib/article-assets";
import {
  classifyGhostArticle,
  findOrphanObjects,
  type GhostVerdict,
  type SweepableObject,
} from "../lib/ghost-content";
import { isStaleAsset } from "../lib/stale-assets";
import { purgeArticleAssets, type DeletableArticle } from "../lib/article-deletion";
import { deleteKeysFromR2, getR2Config, listR2Objects, r2KeyFromUrl } from "../lib/storage";

// ── Flags ────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const INCLUDE_PROBABLE = process.argv.includes("--include-probable");
const SKIP_DB = process.argv.includes("--skip-db");
const SKIP_R2 = process.argv.includes("--skip-r2");
const SKIP_CONTENT_SCAN = process.argv.includes("--skip-content-scan");
const FORCE_ORPHANS = process.argv.includes("--force-orphans");
const FORCE_ANY_PREFIX = process.argv.includes("--force-any-prefix");

/** `--match "text"` (repeatable) and `--slug value` (repeatable). */
function collectFlagValues(flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === flag && process.argv[i + 1]) values.push(process.argv[i + 1]);
  }
  return values;
}

function numberFlag(flag: string, fallback: number): number {
  const raw = collectFlagValues(flag)[0];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const EXTRA_PHRASES = collectFlagValues("--match");
const EXTRA_SLUGS = collectFlagValues("--slug").map((value) => value.toLowerCase());
const PREFIXES = collectFlagValues("--prefix");
const GRACE_DAYS = numberFlag("--grace-days", 7);
const CONTENT_SCAN_CONCURRENCY = Math.max(1, numberFlag("--concurrency", 4));

/**
 * Where the sweep looks by default: exactly the namespaces the article pipeline
 * writes to. Anything outside them (a brand asset, a deployment's own folder) is
 * not this script's business.
 */
const DEFAULT_PREFIXES = ["xsypher/articles/", "articles/"];

interface Row {
  id: string;
  slug: string;
  title: string;
  deck: string | null;
  status: string;
  publishedAt: Date | null;
  img: string | null;
  ogImage: string | null;
  contentUrl: string | null;
}

function asDeletable(row: Row): DeletableArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    img: row.img,
    ogImage: row.ogImage,
    contentUrl: row.contentUrl,
    publishedAt: row.publishedAt,
  };
}

/** Read one content payload for the asset scan. Never throws. */
async function readContent(contentUrl: string | null): Promise<unknown> {
  if (!contentUrl) return null;
  const config = getR2Config();
  if ("error" in config) return null;
  const url = /^https?:\/\//i.test(contentUrl)
    ? contentUrl
    : `${config.publicBase}/${contentUrl.replace(/^\/+/, "")}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.includes("application/json") ? await res.json() : await res.text();
  } catch {
    return null;
  }
}

// ── Sweep 1: ghost rows ──────────────────────────────────────────────────────
async function sweepGhostRows(): Promise<number> {
  const rows: Row[] = await db
    .select({
      id: article.id,
      slug: article.slug,
      title: article.title,
      deck: article.deck,
      status: article.status,
      publishedAt: article.publishedAt,
      img: article.img,
      ogImage: article.ogImage,
      contentUrl: article.contentUrl,
    })
    .from(article);

  const confirmed: { row: Row; verdict: GhostVerdict }[] = [];
  const probable: { row: Row; verdict: GhostVerdict }[] = [];

  for (const row of rows) {
    if (EXTRA_SLUGS.includes(row.slug.toLowerCase())) {
      confirmed.push({ row, verdict: { confidence: "confirmed", reasons: ["named with --slug"] } });
      continue;
    }
    const verdict = classifyGhostArticle({
      title: row.title,
      slug: row.slug,
      deck: row.deck,
      extraPhrases: EXTRA_PHRASES,
    });
    if (!verdict) continue;
    (verdict.confidence === "confirmed" ? confirmed : probable).push({ row, verdict });
  }

  console.log(
    `[ghost] articles: ${rows.length} scanned, ${confirmed.length} confirmed fixture(s), ${probable.length} probable.`,
  );

  const describe = (row: Row, verdict: GhostVerdict) => {
    const live = row.status === "PUBLISHED" && row.publishedAt ? " — LIVE (was published)" : ` — ${row.status}`;
    console.log(`        "${row.title}"  [/${row.slug}]${live}`);
    for (const reason of verdict.reasons) console.log(`          · ${reason}`);
    if (row.img && isStaleAsset(row.img)) console.log(`          · featured image is a known stale asset: ${row.img}`);
  };

  if (confirmed.length) {
    console.log("[ghost] confirmed fixtures:");
    for (const { row, verdict } of confirmed) describe(row, verdict);
  }
  if (probable.length) {
    console.log(`[ghost] probable (needs a human — pass --include-probable to delete these too):`);
    for (const { row, verdict } of probable) describe(row, verdict);
  }

  const targets = INCLUDE_PROBABLE ? [...confirmed, ...probable] : confirmed;

  if (!targets.length) {
    console.log("[ghost] nothing to delete.");
    return 0;
  }

  if (!APPLY) {
    console.log(`[ghost] DRY RUN — ${targets.length} row(s) would be purged. Re-run with --apply to write.`);
    return targets.length;
  }

  let purged = 0;
  for (const { row } of targets) {
    try {
      // Revision rows can name content keys the article no longer points at
      // (a restored version, a legacy save). They are read before the rows go.
      const revisions = await db
        .select({ contentUrl: articleRevision.contentUrl })
        .from(articleRevision)
        .where(eq(articleRevision.articleId, row.id));

      const report = await purgeArticleAssets(asDeletable(row), {
        extraReferences: revisions.map((revision) => revision.contentUrl),
      });
      if (report.failed.length) {
        console.warn(`[ghost]   ${report.failed.length} R2 object(s) failed for /${row.slug}:`, report.failed);
      }

      const ids = [row.id];
      await db.delete(articleReview).where(inArray(articleReview.articleId, ids));
      await db.delete(articleRevision).where(inArray(articleRevision.articleId, ids));
      await db.delete(comment).where(eq(comment.articleSlug, row.slug));
      await db.delete(article).where(eq(article.id, row.id));

      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: null,
        action: "PURGE_GHOST_ARTICLE",
        entityType: "Article",
        entityId: row.id,
        details: {
          title: row.title,
          slug: row.slug,
          status: row.status,
          r2KeysDeleted: report.deleted.length,
          r2KeysFailed: report.failed.length,
        },
      });

      purged++;
      console.log(
        `[ghost]   purged /${row.slug} — row deleted, ${report.deleted.length}/${report.keys.length} R2 object(s) removed.`,
      );
    } catch (error) {
      console.error(`[ghost]   FAILED to purge /${row.slug}:`, error);
      throw error;
    }
  }

  console.log(`[ghost] ${purged} row(s) purged.`);
  return purged;
}

// ── Sweep 2: orphaned R2 objects ─────────────────────────────────────────────
async function buildLiveKeySet(): Promise<{ live: Set<string>; unreadable: number; skippedContentScan: boolean }> {
  const live = new Set<string>();
  const add = (value: string | null | undefined) => {
    const key = r2KeyFromUrl(value ?? null);
    if (key) live.add(key);
  };

  const rows: Row[] = await db
    .select({
      id: article.id,
      slug: article.slug,
      title: article.title,
      deck: article.deck,
      status: article.status,
      publishedAt: article.publishedAt,
      img: article.img,
      ogImage: article.ogImage,
      contentUrl: article.contentUrl,
    })
    .from(article);

  for (const row of rows) {
    add(row.img);
    add(row.ogImage);
    add(row.contentUrl);
  }

  // Other tables that can hold an R2 URL. Missing one is how a live asset gets
  // deleted, so this list is deliberately explicit.
  const [settings] = await db
    .select({
      defaultOgImage: publicationSettings.defaultOgImage,
      logoUrl: publicationSettings.logoUrl,
      faviconUrl: publicationSettings.faviconUrl,
    })
    .from(publicationSettings)
    .limit(1);
  add(settings?.defaultOgImage);
  add(settings?.logoUrl);
  add(settings?.faviconUrl);

  const authorAvatars = await db
    .select({ avatar: author.avatar })
    .from(author)
    .where(isNotNull(author.avatar));
  for (const row of authorAvatars) add(row.avatar);

  const revisionBodies = await db
    .select({ contentUrl: articleRevision.contentUrl })
    .from(articleRevision)
    .where(isNotNull(articleRevision.contentUrl));
  for (const row of revisionBodies) add(row.contentUrl);

  console.log(`[orphans] ${live.size} live key(s) referenced by columns and metadata.`);

  if (SKIP_CONTENT_SCAN) {
    console.log("[orphans] --skip-content-scan: inline images inside article bodies are NOT counted as live.");
    console.log("[orphans]            Only use this to see the size of the problem, never to delete.");
    return { live, unreadable: 0, skippedContentScan: true };
  }

  // Inline media: the only complete source is the content bodies themselves.
  const withContent = rows.filter((row) => row.contentUrl);
  console.log(
    `[orphans] reading ${withContent.length} content body/bodies from R2 to collect inline media (concurrency ${CONTENT_SCAN_CONCURRENCY})…`,
  );

  let scanned = 0;
  let unreadable = 0;
  for (let i = 0; i < withContent.length; i += CONTENT_SCAN_CONCURRENCY) {
    const slice = withContent.slice(i, i + CONTENT_SCAN_CONCURRENCY);
    const payloads = await Promise.all(slice.map((row) => readContent(row.contentUrl)));
    slice.forEach((row, index) => {
      const payload = payloads[index];
      if (payload == null) {
        unreadable++;
        console.warn(
          `[orphans]   WARNING: could not read content for /${row.slug} — assets referenced only from its body may be reported as orphans.`,
        );
        return;
      }
      for (const key of collectArticleAssetKeys(row, payload)) live.add(key);
      scanned++;
    });
  }

  console.log(
    `[orphans] ${scanned}/${withContent.length} content bodies scanned; ${live.size} live key(s) total.` +
      (unreadable ? ` ${unreadable} body/bodies UNREADABLE.` : ""),
  );
  return { live, unreadable, skippedContentScan: false };
}

async function sweepOrphanObjects(): Promise<number> {
  const prefixes = PREFIXES.length ? PREFIXES : DEFAULT_PREFIXES;
  console.log(`[orphans] listing bucket prefixes: ${prefixes.join(", ")} (grace ${GRACE_DAYS} day(s))`);

  const objects: SweepableObject[] = [];
  for (const prefix of prefixes) {
    const listed = await listR2Objects(prefix);
    console.log(`[orphans]   ${prefix} → ${listed.length} object(s)`);
    objects.push(...listed);
  }

  const { live, unreadable, skippedContentScan } = await buildLiveKeySet();

  // Only the article pipeline's own namespaces are candidates. A body can embed
  // a shared asset, and a shared asset that one story happens to reference is
  // still shared — the sweep reports it rather than deleting it.
  const candidates = FORCE_ANY_PREFIX ? objects : objects.filter((object) => isArticleAssetKey(object.key));
  const outOfNamespace = objects.length - candidates.length;
  if (outOfNamespace) {
    console.log(
      `[orphans] ${outOfNamespace} object(s) outside the article namespaces were listed and left alone` +
        (FORCE_ANY_PREFIX ? "" : " (pass --force-any-prefix to include them)"),
    );
  }

  const orphans = findOrphanObjects(candidates, live, { graceMs: GRACE_DAYS * 24 * 60 * 60 * 1000 });

  // Stale-named objects are worth calling out separately: the truck image is the
  // reason this sweep exists, and seeing its key in the list is the confirmation
  // that it is really gone from the bucket (not just unlinked in the database).
  const staleNamed = objects.filter((object) => isStaleAsset(object.key));

  console.log(
    `[orphans] ${objects.length} object(s) listed, ${orphans.length} unreferenced (older than ${GRACE_DAYS} day(s)).`,
  );
  for (const object of orphans.slice(0, 100)) {
    const age = object.lastModified ? object.lastModified.toISOString().slice(0, 10) : "unknown date";
    const size = typeof object.size === "number" ? `${(object.size / 1024).toFixed(0)} KB` : "?";
    console.log(`        ${object.key}  (${size}, ${age})`);
  }
  if (orphans.length > 100) console.log(`        … and ${orphans.length - 100} more`);

  if (staleNamed.length) {
    console.log(`[orphans] ${staleNamed.length} object(s) match the known-stale placeholder list:`);
    for (const object of staleNamed) console.log(`        ${object.key}`);
    console.log(
      "[orphans] if any of them are still referenced by a row, run scripts/purge-stale-assets.ts first: " +
        "this sweep only removes objects nothing points at, and unlinking is the other script's job.",
    );
  } else {
    console.log("[orphans] no known-stale placeholder objects in the bucket.");
  }

  if (!orphans.length) {
    console.log("[orphans] nothing to delete.");
    return 0;
  }

  if (!APPLY) {
    console.log(`[orphans] DRY RUN — ${orphans.length} object(s) would be deleted. Re-run with --apply to write.`);
    return orphans.length;
  }

  // Refuse to delete on an incomplete picture. Inline media only exists inside
  // the content bodies, so if a body could not be read (or was skipped) the
  // images it references look unreferenced, and "unreferenced" here means
  // "delete". Re-running once the bucket is reachable is cheap; recovering a
  // deleted photograph is not.
  const blockers: string[] = [];
  if (skippedContentScan) blockers.push("--skip-content-scan was set, so article bodies were never read");
  if (unreadable > 0) blockers.push(`${unreadable} content body/bodies could not be read from R2`);
  if (blockers.length && !FORCE_ORPHANS) {
    throw new Error(
      `refusing to delete ${orphans.length} object(s): ${blockers.join("; ")}. ` +
        "Re-run when the bucket is fully readable, or pass --force-orphans if you accept the risk.",
    );
  }

  const result = await deleteKeysFromR2(orphans.map((object) => object.key));
  console.log(`[orphans] deleted ${result.deleted.length}/${result.requested.length} object(s).`);
  if (result.failed.length) {
    console.error(`[orphans] ${result.failed.length} object(s) failed:`, result.failed.slice(0, 20));
    throw new Error("orphan deletion incomplete");
  }
  return result.deleted.length;
}

async function main() {
  const config = getR2Config();
  console.log(`[purge] mode: ${APPLY ? "APPLY" : "DRY RUN"}`);

  // Checked before anything runs, so an unsafe combination fails without
  // touching the database or the bucket.
  if (APPLY && SKIP_CONTENT_SCAN && !FORCE_ORPHANS) {
    throw new Error(
      "--skip-content-scan with --apply would delete the inline images of live articles " +
        "(their only reference is inside a content body). Re-run without --skip-content-scan, " +
        "or pass --force-orphans if the bodies are known to be unreachable.",
    );
  }
  if ("error" in config) {
    console.log(`[purge] R2 is not configured (${config.error}) — the bucket sweep will be skipped.`);
  }

  let total = 0;
  if (!SKIP_DB) total += await sweepGhostRows();
  if (!SKIP_R2) {
    if ("error" in config) {
      console.log("[orphans] skipped: R2 credentials are not configured.");
    } else {
      total += await sweepOrphanObjects();
    }
  }

  console.log(
    total
      ? `[purge] done — ${total} item(s) ${APPLY ? "purged" : "would be purged"}.`
      : "[purge] done — nothing to purge.",
  );

  if (APPLY && total) {
    console.log(
      "[purge] reminder: run this where you can also redeploy (or delete from the dashboard) so the public " +
        "ISR cache does not keep serving pages for the deleted slugs.",
    );
  }
}

main()
  .then(() => {
    // The Neon pool keeps the event loop alive; exit explicitly like the other
    // maintenance scripts do.
    process.exit(0);
  })
  .catch((error) => {
    console.error("[purge] FAILED — inspect the output above; nothing was left half-reported:", error);
    process.exit(1);
  });
