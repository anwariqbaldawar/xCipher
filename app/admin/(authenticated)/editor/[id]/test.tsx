import { db } from "@/lib/db";
import { article as articleTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await db.query.article.findFirst({ where: eq(articleTable.id, id) });
  return <pre>{JSON.stringify({ id, articleFound: !!article }, null, 2)}</pre>;
}
