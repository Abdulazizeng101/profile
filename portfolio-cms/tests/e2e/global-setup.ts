import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

import { Client } from "pg";

import { E2E_DATABASE_URL } from "../../playwright.config";

export const ADMIN = { email: "e2e-admin@example.com", password: "e2e-correct-horse-battery" };

/** Fresh database for every run: wipe, migrate, seed, create the admin account. */
export default async function globalSetup() {
  const url = new URL(E2E_DATABASE_URL);
  if (!/test|e2e/i.test(url.pathname)) {
    throw new Error(
      `Refusing to wipe "${url.pathname}": the E2E database name must contain "test" or "e2e".`,
    );
  }

  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  await client.query(
    "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;",
  );
  await client.end();
  rmSync("./storage-e2e", { recursive: true, force: true });

  const env = {
    ...process.env,
    DATABASE_URL: E2E_DATABASE_URL,
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
  };
  for (const script of ["scripts/migrate.ts", "scripts/seed.ts", "scripts/create-admin.ts"]) {
    execFileSync("pnpm", ["exec", "tsx", script], { env, stdio: "inherit" });
  }
}
