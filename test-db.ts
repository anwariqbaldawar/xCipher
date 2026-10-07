import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './lib/db/schema';
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function run() {
  const queryClient = postgres(process.env.DATABASE_URL!);
  const db = drizzle(queryClient, { schema });
  try {
    const articles = await db.select({ id: schema.article.id }).from(schema.article).limit(1);
    console.log("Articles:", articles);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
