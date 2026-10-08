import { db } from "./lib/db";
import { article } from "./lib/db/schema";
import { eq } from "drizzle-orm";
async function run() {
  const res = await db.query.article.findFirst({
    where: eq(article.id, "df4ff87b-70c5-455a-b49b-460c3706c47b"),
  });
  console.log(res);
  process.exit(0);
}
run().catch(console.error);
