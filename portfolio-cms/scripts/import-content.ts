/**
 * Restores a backup made by `pnpm content:export` (a folder) or the JSON file
 * downloaded from Dashboard › Backup & export.
 *
 *   pnpm content:import backups/content-2026-01-31T10-00-00
 *   pnpm content:import portfolio-content-2026-01-31.json
 *   pnpm content:import <path> --yes          # skip the confirmation prompt
 *
 * What it does
 *  1. Validates the file and shows what it contains next to what the database
 *     holds now.
 *  2. Asks you to type REPLACE (unless --yes).
 *  3. Uploads the backup's files to the configured storage (folder backups).
 *  4. In ONE transaction, replaces every content table with the backup's rows.
 *     If anything fails, nothing in the database changes.
 *
 * Admin accounts and sessions are never touched, so you stay signed in.
 * Run `pnpm db:migrate` first on a new database.
 */
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getTableColumns, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { loadEnv } from "./lib/env";
import { ask } from "./lib/prompt";
import { contentTypeForKey, documentDisposition, keysForAsset, storageFromEnv } from "./lib/storage";

loadEnv();

type Row = Record<string, unknown>;
type Asset = { kind: string; storageKey: string; originalName?: string; variants: { key: string }[] };

/** JSON turns timestamps into strings; Drizzle wants Date objects back for timestamp columns. */
function reviveRow(table: PgTable, row: Row): Row {
  const columns = getTableColumns(table);
  const out: Row = {};
  for (const [field, value] of Object.entries(row)) {
    const column = columns[field];
    if (!column)
      throw new Error(`Unknown column "${field}". Was this export made by a newer version of the app?`);
    out[field] = column.dataType === "date" && typeof value === "string" ? new Date(value) : value;
  }
  return out;
}

async function main() {
  const { db, closeDb } = await import("../src/server/db");
  const { EXPORT_FORMAT, EXPORT_TABLES, EXPORT_VERSION } = await import("../src/server/db/export-tables");
  const { STORAGE_KEY_PATTERN } = await import("../src/server/storage/types");

  const input = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!input) throw new Error("Usage: pnpm content:import <backup-folder | export.json> [--yes]");
  const resolved = path.resolve(input);
  if (!existsSync(resolved)) throw new Error(`Not found: ${resolved}`);
  const isFolder = statSync(resolved).isDirectory();
  const jsonPath = isFolder ? path.join(resolved, "content.json") : resolved;
  const mediaDir = isFolder ? path.join(resolved, "media") : null;
  if (!existsSync(jsonPath)) throw new Error(`No content.json in ${resolved}`);

  try {
    /* 1. Validate ---------------------------------------------------------- */
    const data = JSON.parse(await readFile(jsonPath, "utf8")) as {
      format?: string;
      version?: number;
      exportedAt?: string;
      tables?: Record<string, unknown>;
    };
    if (data.format !== EXPORT_FORMAT) throw new Error("This file is not a portfolio content export.");
    if (typeof data.version !== "number" || data.version > EXPORT_VERSION) {
      throw new Error(
        `Export version ${data.version} is not supported by this version of the app (max ${EXPORT_VERSION}).`,
      );
    }
    const tables = data.tables ?? {};
    const names = Object.keys(EXPORT_TABLES) as (keyof typeof EXPORT_TABLES)[];
    for (const name of Object.keys(tables)) {
      if (!names.includes(name as never)) throw new Error(`Unknown table "${name}" in export.`);
    }
    const missingTables = names.filter((name) => !Array.isArray(tables[name]));
    if (missingTables.length)
      throw new Error(`The export is incomplete; missing: ${missingTables.join(", ")}.`);

    const rows = Object.fromEntries(
      names.map((name) => [name, (tables[name] as Row[]).map((row) => reviveRow(EXPORT_TABLES[name], row))]),
    ) as Record<(typeof names)[number], Row[]>;

    const assets = rows.media_assets as unknown as Asset[];
    for (const asset of assets) {
      for (const key of keysForAsset(asset)) {
        if (!STORAGE_KEY_PATTERN.test(key)) throw new Error(`Invalid storage key in export: ${key}`);
      }
    }

    /* 2. Summarise and confirm -------------------------------------------- */
    const current: Record<string, number> = {};
    for (const name of names) {
      const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(EXPORT_TABLES[name]);
      current[name] = row?.n ?? 0;
    }
    console.log(`Backup from ${data.exportedAt ?? "an unknown date"}\n`);
    console.log("  table                          backup   database now");
    for (const name of names) {
      console.log(
        `  ${name.padEnd(30)} ${String(rows[name].length).padStart(6)}   ${String(current[name]).padStart(6)}`,
      );
    }

    const hasMediaFolder = Boolean(mediaDir && existsSync(mediaDir));
    console.log(
      hasMediaFolder
        ? `\nFiles: ${assets.length} media assets will be uploaded to ${process.env.STORAGE_DRIVER || "local"} storage.`
        : "\nFiles: this export has no media folder. The files it references must already exist in your storage.",
    );
    console.log("\nEvery content table above will be REPLACED with the backup. Admin accounts are kept.");

    if (!process.argv.includes("--yes")) {
      const answer = await ask("Type REPLACE to continue, anything else to cancel: ");
      if (answer.trim() !== "REPLACE") {
        console.log("Cancelled. Nothing was changed.");
        return;
      }
    }

    /* 3. Files ------------------------------------------------------------- */
    const store = storageFromEnv();
    if (hasMediaFolder) {
      let uploaded = 0;
      for (const asset of assets) {
        for (const key of keysForAsset(asset)) {
          const file = path.join(mediaDir!, key);
          if (!existsSync(file))
            throw new Error(`The backup is missing the file ${key}. Nothing was changed in the database.`);
          await store.put(key, await readFile(file), {
            contentType: contentTypeForKey(key),
            contentDisposition: key.endsWith(".pdf")
              ? documentDisposition(asset.originalName ?? "")
              : undefined,
          });
          uploaded += 1;
        }
      }
      console.log(`Uploaded ${uploaded} files.`);
    } else {
      const absent: string[] = [];
      for (const asset of assets)
        for (const key of keysForAsset(asset)) if (!(await store.get(key))) absent.push(key);
      if (absent.length) {
        console.warn(
          `Warning: ${absent.length} referenced file(s) are not in storage; those images/files will be missing.`,
        );
      }
    }

    /* 4. Database, all or nothing ----------------------------------------- */
    await db.transaction(async (tx) => {
      for (const name of [...names].reverse()) await tx.delete(EXPORT_TABLES[name]);
      for (const name of names) {
        const list = rows[name];
        for (let i = 0; i < list.length; i += 200) {
          await tx.insert(EXPORT_TABLES[name]).values(list.slice(i, i + 200) as never);
        }
      }
    });

    console.log("\nRestore complete.");
    console.log(
      "If the site is running, open Dashboard › Backup & export and click “Refresh public site” (or restart the app) so visitors see the restored content.",
    );
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
