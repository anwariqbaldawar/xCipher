import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './db/schema';

type Database = ReturnType<typeof createDatabase>;

/**
 * WebSocket implementation for the Neon driver — `ws`, explicitly.
 *
 * The driver speaks Postgres over a WebSocket, so it needs a constructor. In
 * Node the one it would otherwise pick up is the wrong one: the platform
 * global (`globalThis.WebSocket`, Undici-backed) *constructs*, but its
 * connection to the Neon proxy never completes, and the driver surfaces that
 * as a bare `ErrorEvent { type: "error" }` with no Postgres message at all.
 * Every query then rejects — the symptom was `next dev` failing to render
 * (listings empty, `[cached-queries] Failed to fetch …`), SSG aborting during
 * `next build`, and the CLI scripts dying on their first `SELECT`. It also
 * showed up as "Only plain objects … can be passed to Client Components",
 * because Next tried to serialise that ErrorEvent across the server/client
 * boundary.
 *
 * `ws` is the implementation the driver documents for Node, and the one this
 * app used before the assignment below was changed to the global.
 *
 * Assigned only when nothing has claimed it, so a deployment that sets its own
 * constructor — or a test that stubs one — still wins.
 *
 * Note for a future Cloudflare Workers / workerd bundle: `ws` is a Node
 * package and must not be imported there. This file targets the Node server
 * runtime (`next dev`, `next build`, `next start`, the Docker worker); a
 * workerd build has to take the constructor from the platform global instead.
 */
if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws as unknown as typeof neonConfig.webSocketConstructor;
}

/**
 * Concurrent WebSocket connections per pool.
 *
 * One pool is created per process, and a production build fans out across many
 * workers at once. Without a cap, a burst of concurrent SSG builds opens a
 * connection per in-flight query and the pooler starts refusing them.
 */
export const POOL_MAX_CONNECTIONS = 5;

/**
 * Move a Neon connection string onto its pooled (`-pooler`) hostname.
 *
 * Neon exposes two hostnames per endpoint: the direct one and a `-pooler`
 * variant that terminates in PgBouncer. WebSocket connections are long-lived,
 * so hitting the direct endpoint means one backend connection held per pool for
 * the lifetime of the process — exactly the fan-out that exhausts a small
 * compute during a build.
 *
 * Only Neon hostnames are rewritten, a host that is already pooled is left
 * alone, and `NEON_POOLER=off` disables the rewrite entirely for deployments
 * that front the pool themselves.
 */
export function withNeonPooler(connectionString: string): string {
  if (process.env.NEON_POOLER === 'off') return connectionString;

  try {
    const url = new URL(connectionString);
    if (!url.hostname.endsWith('.neon.tech')) return connectionString;
    if (url.hostname.includes('-pooler')) return connectionString;

    const [endpoint, ...rest] = url.hostname.split('.');
    url.hostname = [`${endpoint}-pooler`, ...rest].join('.');
    return url.toString();
  } catch {
    // Not a URL we understand (a socket path, an exotic DSN): leave it exactly
    // as configured rather than guessing.
    return connectionString;
  }
}

function createDatabase(connectionString: string) {
  // Switched to Neon's WebSocket driver (Pool) from the HTTP driver.
  // Next.js 15's fetch monkey-patching causes severe deadlocks and timeouts
  // with unstable_cache and the HTTP driver's fetch calls, resulting in
  // infinite skeleton loading states. The WebSocket driver bypasses fetch.
  const pool = new Pool({
    connectionString: withNeonPooler(connectionString),
    max: POOL_MAX_CONNECTIONS,
  });
  return drizzle(pool, { schema });
}

let cached: { connectionString: string; database: Database } | undefined;
let cachedRead: { connectionString: string; database: Database } | undefined;

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

// Read-only queries (public listings, sitemaps) go here. DATABASE_URL_REPLICA
// is optional: when unset — or when it points at the primary — reads behave
// exactly as before. Point it at a Postgres read replica (e.g. a Neon
// read-only compute) to take listing load off the primary. Single-article
// reads stay on `db` so a just-published story is never served stale.
function getReadDatabase(): Database {
  const primary = process.env.DATABASE_URL;
  if (!primary) {
    throw new Error("DATABASE_URL is not set");
  }
  const connectionString = process.env.DATABASE_URL_REPLICA || primary;
  if (!cachedRead || cachedRead.connectionString !== connectionString) {
    cachedRead = { connectionString, database: createDatabase(connectionString) };
  }
  return cachedRead.database;
}

function createDbProxy(resolve: () => Database): Database {
  return new Proxy({} as Database, {
    get(_target, property) {
      const database = resolve();
      const value = Reflect.get(database, property, database);
      // Preserve callable own properties such as the driver's $client (and its
      // query helpers); only prototype methods need the database as receiver.
      return typeof value === "function" && !Object.prototype.hasOwnProperty.call(database, property)
        ? value.bind(database)
        : value;
    },
    // Auth.js uses Drizzle's prototype-based database detection.
    getPrototypeOf() {
      return Reflect.getPrototypeOf(resolve());
    },
  });
}

export const db = createDbProxy(getDatabase);
export const dbRead = createDbProxy(getReadDatabase);
