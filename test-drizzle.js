import { pgTable, text } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import { pgDialect } from "drizzle-orm/pg-core";
import { PgDialect } from "drizzle-orm/pg-core";

const article = pgTable("Article", { id: text("id") });

const dialect = new PgDialect();
const query = dialect.sqlToQuery(
  and(eq(article.id, "123"), undefined).getSQL()
);
console.log(query);
