/**
 * Writes a complete, portable backup of your portfolio: every content table as
 * JSON plus every uploaded file (photos, screenshots, CVs), whichever storage
 * driver is configured.
 *
 *   pnpm content:export                       # -> backups/content-<timestamp>/
 *   pnpm content:export --out ./my-backup     # choose the folder
 *   pnpm content:export --no-media            # JSON only
 *
 * Result:
 *   <folder>/content.json      tables (no passwords, sessions or rate limits)
 *   <folder>/media/<key>       the stored files, under their storage keys
 *
 * Restore it with `pnpm content:import <folder>`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnv } from "./lib/env";
import { keysForAsset, storageFromEnv } from "./lib/storage";

loadEnv();

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const { db, closeDb } = await import("../src/server/db");
  const { EXPORT_FORMAT, EXPORT_TABLES, EXPORT_VERSION } = await import("../src/server/db/export-tables");
  const withMedia = !process.argv.includes("--no-media");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.resolve(argValue("--out") ?? path.join("backups", `content-${stamp}`));

  try {
    const tables: Record<string, Record<string, unknown>[]> = {};
    for (const [name, table] of Object.entries(EXPORT_TABLES)) {
      tables[name] = (await db.select().from(table)) as Record<string, unknown>[];
    }

    await mkdir(outDir, { recursive: true });
    const data = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      includesMedia: withMedia,
      tables,
    };
    await writeFile(path.join(outDir, "content.json"), JSON.stringify(data, null, 2));

    let files = 0;
    const missing: string[] = [];
    if (withMedia) {
      const store = storageFromEnv();
      const assets = (tables.media_assets ?? []) as {
        kind: string;
        storageKey: string;
        variants: { key: string }[];
      }[];
      for (const asset of assets) {
        for (const key of keysForAsset(asset)) {
          const object = await store.get(key);
          if (!object) {
            missing.push(key);
            continue;
          }
          const target = path.join(outDir, "media", key);
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, object.body);
          files += 1;
        }
      }
    }

    const rows = Object.values(tables).reduce((sum, list) => sum + list.length, 0);
    console.log(
      `Exported ${rows} rows from ${Object.keys(tables).length} tables${withMedia ? ` and ${files} files` : ""}.`,
    );
    console.log(`Backup folder: ${outDir}`);
    if (missing.length) {
      console.warn(`\nWarning: ${missing.length} stored file(s) referenced in the database were not found:`);
      for (const key of missing.slice(0, 20)) console.warn(`  ${key}`);
    }
    console.log("\nThis folder contains your personal content. Keep it somewhere private.");
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error("Export failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
