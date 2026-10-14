ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "editorPickedAt" timestamp (3);--> statement-breakpoint
-- Backfill existing picks so the current order is preserved: legacy picks sort by
-- publishedAt exactly as before, until they are re-picked or re-ordered.
UPDATE "Article"
SET "editorPickedAt" = COALESCE("publishedAt", "updatedAt")
WHERE "homepagePlacement" = 'picks' AND "editorPickedAt" IS NULL;
