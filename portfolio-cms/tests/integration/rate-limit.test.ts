/**
 * Runs against a real PostgreSQL database: TEST_DATABASE_URL (its name must
 * contain "test"). Skipped when it isn't set. The rate_limits table is
 * emptied before each test; nothing else is touched.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url && !/test/i.test(new URL(url).pathname)) {
  throw new Error("TEST_DATABASE_URL must point at a database whose name contains 'test'.");
}
if (!url) console.warn("Skipping database tests: set TEST_DATABASE_URL (see README › Testing).");

describe.skipIf(!url)("Postgres rate limiter", () => {
  let mod: typeof import("@/server/security/rate-limit");
  let dbMod: typeof import("@/server/db");

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    dbMod = await import("@/server/db");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(dbMod.db, { migrationsFolder: "./drizzle" });
    mod = await import("@/server/security/rate-limit");
  });

  beforeEach(async () => {
    const { sql } = await import("drizzle-orm");
    await dbMod.db.execute(sql`DELETE FROM rate_limits`);
  });

  afterAll(async () => {
    await dbMod?.closeDb();
  });

  it("allows up to the limit, then blocks", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await mod.hitRateLimit("t:basic", 3, 60));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
    expect(results[3]!.retryAfterSeconds).toBeGreaterThan(0);
    expect(results[3]!.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("counts concurrent requests exactly (no lost updates)", async () => {
    const results = await Promise.all(Array.from({ length: 25 }, () => mod.hitRateLimit("t:burst", 10, 60)));
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
  });

  it("keeps keys independent and can peek and reset", async () => {
    await mod.hitRateLimit("t:a", 5, 60);
    await mod.hitRateLimit("t:a", 5, 60);
    await mod.hitRateLimit("t:b", 5, 60);
    expect(await mod.peekRateLimit("t:a", 60)).toBe(2);
    expect(await mod.peekRateLimit("t:b", 60)).toBe(1);
    await mod.resetRateLimit("t:a");
    expect(await mod.peekRateLimit("t:a", 60)).toBe(0);
  });

  it("starts a new window after the old one expires", async () => {
    const { sql } = await import("drizzle-orm");
    for (let i = 0; i < 3; i++) await mod.hitRateLimit("t:window", 3, 60);
    expect((await mod.hitRateLimit("t:window", 3, 60)).allowed).toBe(false);
    await dbMod.db.execute(
      sql`UPDATE rate_limits SET window_started_at = now() - interval '61 seconds' WHERE key = 't:window'`,
    );
    const fresh = await mod.hitRateLimit("t:window", 3, 60);
    expect(fresh).toMatchObject({ allowed: true, count: 1 });
  });
});
