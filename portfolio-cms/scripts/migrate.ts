/**
 * Applies pending SQL migrations from ./drizzle.
 *
 *   pnpm db:migrate
 *
 * Each migration runs inside a transaction and is recorded in the
 * drizzle.__drizzle_migrations table, so running this repeatedly is safe.
 * It is also run automatically by `pnpm vercel-build` before `next build`.
 */
import { loadEnv } from "./lib/env";

loadEnv();

async function main() {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { db, closeDb } = await import("../src/server/db");
  const started = Date.now();
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`Migrations applied in ${Date.now() - started} ms.`);
  await closeDb();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
