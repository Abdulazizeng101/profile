import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

declare global {
  var __portfolioDb: { pool: Pool; db: Database } | undefined;
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  const pool = new Pool({
    connectionString,
    // Small pool: serverless instances each hold their own pool, and managed
    // Postgres providers put a connection pooler in front of the database.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  return { pool, db };
}

/**
 * Lazily created so that importing this module never opens a connection
 * (e.g. during type generation), and reused across hot reloads in development.
 */
function instance() {
  if (!globalThis.__portfolioDb) globalThis.__portfolioDb = createDb();
  return globalThis.__portfolioDb;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const target = instance().db;
    const value = Reflect.get(target, property);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export async function closeDb() {
  if (globalThis.__portfolioDb) {
    await globalThis.__portfolioDb.pool.end();
    globalThis.__portfolioDb = undefined;
  }
}

export { schema };
