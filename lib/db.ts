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

/**
 * How long an idle WebSocket connection is kept before the pool releases it.
 *
 * This is part of the billing story, not a detail. Neon suspends a compute after
 * ~5 minutes with no connections; a pool that holds a socket open indefinitely
 * keeps it awake forever, which is exactly the shape the caching layer is meant
 * to remove. Ten seconds means the pool lets go shortly after the last query of a
 * burst — a page render, a build step, an admin save — so the compute can reach
 * its idle window instead of being pinned by a connection nobody is using.
 *
 * The cost of releasing a connection is one reconnect on the next query (the
 * driver re-dials through the pooler), which is a few milliseconds against a
 * compute-hour. Overridable for a deployment that would rather hold connections
 * open: `NEON_POOL_IDLE_TIMEOUT_MS`.
 */
export function poolIdleTimeoutMs(): number {
  const parsed = Number(process.env.NEON_POOL_IDLE_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10_000;
}

function createDatabase(connectionString: string) {
  // Switched to Neon's WebSocket driver (Pool) from the HTTP driver.
  // Next.js 15's fetch monkey-patching causes severe deadlocks and timeouts
  // with unstable_cache and the HTTP driver's fetch calls, resulting in
  // infinite skeleton loading states. The WebSocket driver bypasses fetch.
  const pool = new Pool({
    connectionString: withNeonPooler(connectionString),
    max: POOL_MAX_CONNECTIONS,
    // Neon serverless compute can take 1-3 seconds to wake from scale-to-zero.
    // 10 seconds is generous enough for the slowest cold start without letting
    // the process hang indefinitely when the proxy is unreachable.
    connectionTimeoutMillis: 10_000,
    // Reclaim idle connections so the pooler doesn't run out under sustained
    // concurrency, and so the compute is allowed to suspend between bursts.
    idleTimeoutMillis: poolIdleTimeoutMs(),
  });
  return drizzle(pool, { schema });
}

/**
 * Pools, held on `globalThis` rather than in module scope.
 *
 * `next dev` re-evaluates a module on every hot reload. A module-scope variable
 * therefore does not survive an edit, and each reload used to create a *new* pool
 * while the previous one's WebSocket connections were still open — a handful of
 * connections leaked per file save, each of them holding a Neon compute awake
 * (and eventually exhausting the pooler's connection slots). A production build
 * has the same failure mode across re-imported bundles inside a single process.
 *
 * The store is keyed by connection string, so the proxy's contract is unchanged:
 * asking for a different `DATABASE_URL` still yields a different client, and the
 * same URL still yields the same one for the life of the process.
 */
interface PoolStore {
  primary?: { connectionString: string; database: Database };
  replica?: { connectionString: string; database: Database };
}

const globalForDb = globalThis as typeof globalThis & { __xsypherPoolStore?: PoolStore };
const pools: PoolStore = (globalForDb.__xsypherPoolStore ??= {});

function getDatabase(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!pools.primary || pools.primary.connectionString !== connectionString) {
    pools.primary = { connectionString, database: createDatabase(connectionString) };
    const env = process.env;
    if (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_SITE_URL) {
      console.warn("⚠️ WARNING: NEXT_PUBLIC_SITE_URL is not set in production. Canonical URLs and feeds may be broken.");
    }
  }
  return pools.primary.database;
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
  if (!pools.replica || pools.replica.connectionString !== connectionString) {
    pools.replica = { connectionString, database: createDatabase(connectionString) };
  }
  return pools.replica.database;
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
