import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DATABASE_URL);
async function run() {
  const article = await sql`SELECT id, status, "authorId", title, "categoryId" FROM "Article" WHERE id = 'df4ff87b-70c5-455a-b49b-460c3706c47b'`;
  console.log("Article:", article);
  const users = await sql`SELECT id, role, "authorId" FROM "User"`;
  console.log("Users:", users);
  process.exit(0);
}
run().catch(console.error);
