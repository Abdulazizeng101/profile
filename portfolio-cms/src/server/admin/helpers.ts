import "server-only";

import { eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { updateTag } from "next/cache";

import { TAGS, type Tag } from "@/server/content/tags";
import { db, type Database } from "@/server/db";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

const snake = (key: string) => key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

/** `SET field = excluded.field` for an upsert, for the given TypeScript field names. */
export function excludedSet(fields: string[]): Record<string, SQL> {
  return Object.fromEntries(fields.map((field) => [field, sql.raw(`excluded."${snake(field)}"`)]));
}

/** Expires public cache tags so saved changes appear on the site immediately. */
export function expire(...tags: Tag[]) {
  for (const tag of new Set<Tag>([...tags, TAGS.all])) updateTag(tag);
}

/** Sets sortOrder = position for the given ids, inside one transaction. */
export async function applyOrder(table: PgTable & { id: PgColumn; sortOrder: PgColumn }, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(table)
        .set({ sortOrder: index } as never)
        .where(eq(table.id, id));
    }
  });
}

/** Lowest current sortOrder minus one, so new entries appear first. */
export async function firstPosition(table: PgTable & { sortOrder: PgColumn }): Promise<number> {
  const [row] = await db.select({ min: sql<number>`coalesce(min(${table.sortOrder}), 0)` }).from(table);
  return Number(row?.min ?? 0) - 1;
}

/** Highest current sortOrder plus one, so new entries appear last. */
export async function lastPosition(table: PgTable & { sortOrder: PgColumn }): Promise<number> {
  const [row] = await db.select({ max: sql<number>`coalesce(max(${table.sortOrder}), -1)` }).from(table);
  return Number(row?.max ?? -1) + 1;
}

/** Replaces a join table's links for one parent, keeping the given order. */
export async function replaceLinks<T extends PgTable>(
  tx: DbOrTx,
  table: T,
  parentColumn: PgColumn,
  parentId: string,
  rows: Record<string, unknown>[],
) {
  await tx.delete(table).where(eq(parentColumn, parentId));
  if (rows.length) await tx.insert(table).values(rows as never);
}

/** Postgres error code from a (possibly wrapped) driver error, e.g. "23505" for unique violations. */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
