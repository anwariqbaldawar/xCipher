import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './lib/db/schema';
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function run() {
  const client = neon(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });
  try {
    const articles = await db.select({ id: schema.article.id }).from(schema.article).limit(1);
    console.log("Articles:", articles);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
