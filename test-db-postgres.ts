import postgres from 'postgres';
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function run() {
  // Use UNPOOLED for migrations/direct queries
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const sql = postgres(url!);
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables in public schema:");
    tables.forEach(t => console.log(t.table_name));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await sql.end();
  }
}
run();
