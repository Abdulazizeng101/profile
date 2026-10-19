/**
 * Resets an admin password from the command line (account recovery) and signs
 * that account out everywhere.
 *
 *   pnpm admin:reset-password
 */
import { eq, sql } from "drizzle-orm";

import { loadEnv } from "./lib/env";
import { readCredentials } from "./lib/prompt";

loadEnv();

async function main() {
  const { db, closeDb } = await import("../src/server/db");
  const { adminUsers, sessions } = await import("../src/server/db/schema");
  const { hashPassword, passwordProblem } = await import("../src/server/auth/password");

  try {
    const { email, password } = await readCredentials();
    const problem = passwordProblem(password, email);
    if (problem) throw new Error(problem);

    const [user] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(sql`lower(${adminUsers.email}) = ${email}`);
    if (!user) throw new Error(`No admin account uses ${email}.`);

    await db.transaction(async (tx) => {
      await tx
        .update(adminUsers)
        .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date() })
        .where(eq(adminUsers.id, user.id));
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
    });
    console.log(`Password updated for ${email}. All existing sessions were signed out.`);
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
