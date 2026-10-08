import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DATABASE_URL);
async function run() {
  const id = '11111111-1111-1111-1111-111111111111';
  await sql`INSERT INTO "Article" (id, title, slug, status, "authorId", "categoryId") VALUES (${id}, 'Test', 'test-1', 'DRAFT', 'bbb2b047-9fa0-4fd8-b84b-ddf926a06596', 'c4974fcd-6136-4fc6-b484-90a6ea1f7b7f')`;
  console.log("Inserted article");
  process.exit(0);
}
run().catch(console.error);
