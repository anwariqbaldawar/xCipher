import postgres from "postgres";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const envFile of [".env.production", ".env.local", ".env"]) {
    const filePath = join(process.cwd(), envFile);
    if (!existsSync(filePath)) continue;
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return undefined;
}

const connectionString = resolveDatabaseUrl();

if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// connect with prepare: false which is required for pooled connections
const sql = postgres(connectionString, { prepare: false });

async function migrate() {
  try {
    await sql.begin(async (tx) => {
      // Idempotent ledger table for tracking applied Drizzle migration tags.
      await tx`CREATE TABLE IF NOT EXISTS "_SchemaMigration" (
        "tag" text PRIMARY KEY NOT NULL,
        "appliedAt" timestamp(3) DEFAULT now() NOT NULL
      )`;

      console.log("Ensuring Article and ArticleRevision columns & indexes...");
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "contentUrl" text`;
      await tx`ALTER TABLE "ArticleRevision" ADD COLUMN IF NOT EXISTS "contentUrl" text`;
      await tx`ALTER TABLE "Article" DROP COLUMN IF EXISTS "contentHtml"`;
      await tx`ALTER TABLE "Article" DROP COLUMN IF EXISTS "contentJson"`;
      await tx`ALTER TABLE "ArticleRevision" DROP COLUMN IF EXISTS "contentHtml"`;
      await tx`ALTER TABLE "ArticleRevision" DROP COLUMN IF EXISTS "contentJson"`;

      // 0001_editorial_personas.sql
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "isAnonymous" boolean DEFAULT false NOT NULL`;

      // 0002_silent_falcon.sql
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "textContent" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "metaTitle" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "metaDescription" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "ogImage" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "focusKeyword" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "canonicalUrl" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "featuredImageAlt" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "featuredImageCaption" text`;
      await tx`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "featuredImageCredit" text`;
      await tx`CREATE INDEX IF NOT EXISTS "Article_search_idx" ON "Article" USING gin (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("deck", '') || ' ' || coalesce("textContent", '')))`;

      // 0003_contact_and_two_factor.sql
      await tx`CREATE TABLE IF NOT EXISTS "ContactMessage" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL,
        "department" text NOT NULL,
        "message" text NOT NULL,
        "ip" text,
        "userAgent" text,
        "status" text DEFAULT 'NEW' NOT NULL,
        "createdAt" timestamp(3) DEFAULT now() NOT NULL
      )`;
      await tx`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" text`;
      await tx`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" boolean DEFAULT false NOT NULL`;
      await tx`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "backupCodes" text[] DEFAULT ARRAY[]::text[] NOT NULL`;

      // Operational lookup indexes
      await tx`CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_used_idx" ON "PasswordResetToken" ("userId", "used")`;
      await tx`CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt")`;
      await tx`CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog" ("userId")`;
      await tx`CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification" ("userId", "isRead", "createdAt")`;
      await tx`CREATE INDEX IF NOT EXISTS "Invitation_status_expires_idx" ON "Invitation" ("status", "expires")`;
      await tx`CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx" ON "ContactMessage" ("status", "createdAt")`;

      // Record baseline migrations in ledger
      const drizzleDir = join(process.cwd(), "drizzle");
      const sqlFiles = readdirSync(drizzleDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
      for (const file of sqlFiles) {
        await tx`INSERT INTO "_SchemaMigration" ("tag") VALUES (${file}) ON CONFLICT ("tag") DO NOTHING`;
      }
    });

    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
