import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { EXPORT_TABLES } from "@/server/db/export-tables";
import * as schema from "@/server/db/schema";

/** Tables that must NOT be in a content backup. */
const EXCLUDED = ["admin_users", "sessions", "rate_limits"];

describe("content backups", () => {
  it("include every content table (add new tables to export-tables.ts)", () => {
    const all = Object.values(schema)
      .filter((value) => is(value, PgTable))
      .map((table) => getTableName(table as PgTable))
      .sort();
    const exported = Object.values(EXPORT_TABLES)
      .map((t) => getTableName(t))
      .sort();
    expect(exported).toEqual(all.filter((name) => !EXCLUDED.includes(name)));
  });

  it("list parent tables before the tables that reference them", () => {
    const order = Object.keys(EXPORT_TABLES);
    const before = (parent: string, child: string) =>
      expect(order.indexOf(parent)).toBeLessThan(order.indexOf(child));
    before("media_assets", "project_images");
    before("projects", "project_images");
    before("skills", "project_skills");
    before("skill_categories", "skills");
    before("experiences", "experience_skills");
    before("profile", "profile_translations");
  });
});
