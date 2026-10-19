import { sql } from "drizzle-orm";

import { db } from "@/server/db";

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window rate limiter backed by Postgres, so it works across serverless
 * instances without Redis. One atomic upsert per check.
 *
 * @param key     namespaced key, e.g. "login:ip:<hash>"
 * @param limit   maximum hits allowed per window
 * @param windowSeconds window length
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const result = await db.execute<{ count: number; window_started_at: Date }>(sql`
    INSERT INTO rate_limits (key, count, window_started_at)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_started_at < now() - make_interval(secs => ${windowSeconds})
        THEN 1 ELSE rate_limits.count + 1 END,
      window_started_at = CASE
        WHEN rate_limits.window_started_at < now() - make_interval(secs => ${windowSeconds})
        THEN now() ELSE rate_limits.window_started_at END
    RETURNING count, window_started_at
  `);
  const row = result.rows[0];
  const count = Number(row?.count ?? 1);
  const startedAt = row ? new Date(row.window_started_at).getTime() : Date.now();
  const retryAfterSeconds = Math.max(0, Math.ceil((startedAt + windowSeconds * 1000 - Date.now()) / 1000));
  return {
    allowed: count <= limit,
    count,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

/** Reads the current count without incrementing it. */
export async function peekRateLimit(key: string, windowSeconds: number): Promise<number> {
  const result = await db.execute<{ count: number }>(sql`
    SELECT count FROM rate_limits
    WHERE key = ${key} AND window_started_at >= now() - make_interval(secs => ${windowSeconds})
  `);
  return Number(result.rows[0]?.count ?? 0);
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}

/** Housekeeping: drop windows that ended more than a day ago. */
export async function pruneRateLimits(): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE window_started_at < now() - interval '1 day'`);
}
