/**
 * Creates the admin account. There is no public sign-up page by design.
 *
 *   pnpm admin:create
 *
 * Prompts for an email and password (or reads ADMIN_EMAIL / ADMIN_PASSWORD
 * from the environment for non-interactive use). Refuses to create a second
 * admin unless --allow-additional is passed.
 */
import { count } from "drizzle-orm";
import { z } from "zod";

import { loadEnv } from "./lib/env";
import { readCredentials } from "./lib/prompt";

loadEnv();

async function main() {
  const { db, closeDb } = await import("../src/server/db");
  const { adminUsers } = await import("../src/server/db/schema");
  const { hashPassword, passwordProblem } = await import("../src/server/auth/password");

  try {
    const [{ value: existing }] = await db.select({ value: count() }).from(adminUsers);
    if (existing > 0 && !process.argv.includes("--allow-additional")) {
      throw new Error(
        "An admin account already exists. Use `pnpm admin:reset-password` to change its password, " +
          "or pass --allow-additional to create another account.",
      );
    }

    const { email, password } = await readCredentials();
    if (!z.email().safeParse(email).success) throw new Error("Enter a valid email address.");
    const problem = passwordProblem(password, email);
    if (problem) throw new Error(problem);

    await db.insert(adminUsers).values({ email, passwordHash: await hashPassword(password) });
    console.log(`Admin account created for ${email}. Sign in at /admin/login.`);
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
