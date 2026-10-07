import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

type Database = ReturnType<typeof createDatabase>;

function createDatabase(connectionString: string) {
  // Establish a persistent connection pool using native Node.js TCP
  const queryClient = postgres(connectionString, { max: 15, idle_timeout: 20 });
  return drizzle(queryClient, { schema });
}

let cached: { connectionString: string; database: Database } | undefined;

function getDatabase(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!cached || cached.connectionString !== connectionString) {
    cached = { connectionString, database: createDatabase(connectionString) };
    const env = process.env;
    if (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_SITE_URL) {
      console.warn("⚠️ WARNING: NEXT_PUBLIC_SITE_URL is not set in production. Canonical URLs and feeds may be broken.");
    }
  }
  return cached.database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDatabase();
    const value = Reflect.get(database, property, database);
    // Preserve callable own properties such as Neon's $client (and its query
    // helpers); only prototype methods need the database as their receiver.
    return typeof value === "function" && !Object.prototype.hasOwnProperty.call(database, property)
      ? value.bind(database)
      : value;
  },
  // Auth.js uses Drizzle's prototype-based database detection.
  getPrototypeOf() {
    return Reflect.getPrototypeOf(getDatabase());
  },
});
