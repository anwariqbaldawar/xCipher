import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// connect with prepare: false which is required for Supabase pooled connections
const sql = postgres(connectionString, { prepare: false });

async function migrate() {
  try {
    console.log("Adding contentUrl to Article table...");
    await sql`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "contentUrl" text`;
    
    console.log("Adding contentUrl to ArticleRevision table...");
    await sql`ALTER TABLE "ArticleRevision" ADD COLUMN IF NOT EXISTS "contentUrl" text`;
    
    console.log("Removing contentHtml and contentJson from Article table...");
    await sql`ALTER TABLE "Article" DROP COLUMN IF EXISTS "contentHtml"`;
    await sql`ALTER TABLE "Article" DROP COLUMN IF EXISTS "contentJson"`;

    console.log("Removing contentHtml and contentJson from ArticleRevision table...");
    await sql`ALTER TABLE "ArticleRevision" DROP COLUMN IF EXISTS "contentHtml"`;
    await sql`ALTER TABLE "ArticleRevision" DROP COLUMN IF EXISTS "contentJson"`;

    // Contact form storage (drizzle/0003_contact_and_two_factor.sql)
    console.log("Creating ContactMessage table...");
    await sql`CREATE TABLE IF NOT EXISTS "ContactMessage" (
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

    // Two-factor authentication columns (drizzle/0003_contact_and_two_factor.sql)
    console.log("Adding 2FA columns to User table...");
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" text`;
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" boolean DEFAULT false NOT NULL`;
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "backupCodes" text[] DEFAULT ARRAY[]::text[] NOT NULL`;

    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
