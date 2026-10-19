import "server-only";

import { db } from "@/server/db";
import { EXPORT_FORMAT, EXPORT_TABLES, EXPORT_VERSION, type ContentExport } from "@/server/db/export-tables";

export { EXPORT_FORMAT, EXPORT_TABLES, EXPORT_VERSION };

/** Every content table as plain rows. Callers must check the session first. */
export async function exportContent(): Promise<ContentExport> {
  const tables: ContentExport["tables"] = {};
  for (const [name, table] of Object.entries(EXPORT_TABLES)) {
    tables[name as keyof typeof EXPORT_TABLES] = (await db.select().from(table)) as Record<string, unknown>[];
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    note: "Content only. Uploaded files are not inside this JSON: use `pnpm content:export` for a backup that includes them (see docs/BACKUP.md).",
    tables,
  };
}
