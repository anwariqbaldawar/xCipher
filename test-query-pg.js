import pg from "pg";
import "dotenv/config";
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT id, status, \"authorId\", title, \"categoryId\" FROM \"Article\" WHERE id = 'df4ff87b-70c5-455a-b49b-460c3706c47b'");
  console.log("Article:", res.rows[0]);
  const userRes = await client.query("SELECT id, role, \"authorId\" FROM \"User\"");
  console.log("Users:", userRes.rows);
  await client.end();
}
run().catch(console.error);
