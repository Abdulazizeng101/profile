"use server";

/**
 * Education, experience and accomplishments share the same lifecycle:
 * create / update (with translations), publish / unpublish, delete, reorder.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";

import { fail, ok, validationFailed, type ActionResult } from "@/lib/action-result";
import {
  accomplishmentSchema,
  educationSchema,
  experienceSchema,
  reorderSchema,
} from "@/lib/validation/content";
import {
  applyOrder,
  excludedSet,
  expire,
  firstPosition,
  pgErrorCode,
  PG_FOREIGN_KEY_VIOLATION,
  replaceLinks,
} from "@/server/admin/helpers";
import { getAccomplishmentEditor, getEducationEditor, getExperienceEditor } from "@/server/admin/queries";
import { authorizeAdmin } from "@/server/auth/guard";
import { TAGS } from "@/server/content/tags";
import { db } from "@/server/db";
import {
  accomplishments,
  accomplishmentTranslations,
  education,
  educationTranslations,
  experiences,
  experienceSkills,
  experienceTranslations,
  mediaAssets,
} from "@/server/db/schema";

const id = z.uuid();
export type EntryKind = "education" | "experience" | "accomplishment";

async function assertMedia(mediaId: string | null, kind: "image" | "document") {
  if (!mediaId) return true;
  const [asset] = await db
    .select({ kind: mediaAssets.kind })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaId));
  return asset?.kind === kind;
}

/* -------------------------------- education ------------------------------- */

export async function saveEducation(
  entryId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  if (entryId && !id.safeParse(entryId).success) return fail("Invalid entry.");
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { translations, ...base } = parsed.data;
  if (!(await assertMedia(base.logoId, "image"))) return fail("The logo must be an image.");

  const savedId = await db.transaction(async (tx) => {
    let rowId = entryId;
    if (rowId) {
      const [row] = await tx
        .update(education)
        .set(base)
        .where(eq(education.id, rowId))
        .returning({ id: education.id });
      if (!row) return null;
    } else {
      const [row] = await tx
        .insert(education)
        .values({ ...base, sortOrder: await firstPosition(education) })
        .returning({ id: education.id });
      rowId = row!.id;
    }
    await tx
      .insert(educationTranslations)
      .values([
        { educationId: rowId, locale: "en", ...translations.en },
        { educationId: rowId, locale: "ar", ...translations.ar },
      ])
      .onConflictDoUpdate({
        target: [educationTranslations.educationId, educationTranslations.locale],
        set: { ...excludedSet(Object.keys(translations.en)), updatedAt: new Date() },
      });
    return rowId;
  });
  if (!savedId) return fail("This entry no longer exists.");
  expire(TAGS.education);
  return ok(base.status === "published" ? "Saved and published." : "Draft saved.", { id: savedId });
}

/* -------------------------------- experience ------------------------------ */

export async function saveExperience(
  entryId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  if (entryId && !id.safeParse(entryId).success) return fail("Invalid entry.");
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { translations, skillIds, ...base } = parsed.data;
  if (!(await assertMedia(base.logoId, "image"))) return fail("The logo must be an image.");

  try {
    const savedId = await db.transaction(async (tx) => {
      let rowId = entryId;
      if (rowId) {
        const [row] = await tx
          .update(experiences)
          .set(base)
          .where(eq(experiences.id, rowId))
          .returning({ id: experiences.id });
        if (!row) return null;
      } else {
        const [row] = await tx
          .insert(experiences)
          .values({ ...base, sortOrder: await firstPosition(experiences) })
          .returning({ id: experiences.id });
        rowId = row!.id;
      }
      await tx
        .insert(experienceTranslations)
        .values([
          { experienceId: rowId, locale: "en", ...translations.en },
          { experienceId: rowId, locale: "ar", ...translations.ar },
        ])
        .onConflictDoUpdate({
          target: [experienceTranslations.experienceId, experienceTranslations.locale],
          set: { ...excludedSet(Object.keys(translations.en)), updatedAt: new Date() },
        });
      await replaceLinks(
        tx,
        experienceSkills,
        experienceSkills.experienceId,
        rowId,
        [...new Set(skillIds)].map((skillId, sortOrder) => ({ experienceId: rowId, skillId, sortOrder })),
      );
      return rowId;
    });
    if (!savedId) return fail("This entry no longer exists.");
    expire(TAGS.experience);
    return ok(base.status === "published" ? "Saved and published." : "Draft saved.", { id: savedId });
  } catch (error) {
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      return fail("A selected technology no longer exists. Reload the page and try again.");
    }
    throw error;
  }
}

/* ----------------------------- accomplishments ---------------------------- */

export async function saveAccomplishment(
  entryId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  if (entryId && !id.safeParse(entryId).success) return fail("Invalid entry.");
  const parsed = accomplishmentSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { translations, ...base } = parsed.data;
  if (!(await assertMedia(base.documentId, "document"))) return fail("The attached document must be a PDF.");

  const savedId = await db.transaction(async (tx) => {
    let rowId = entryId;
    if (rowId) {
      const [row] = await tx
        .update(accomplishments)
        .set(base)
        .where(eq(accomplishments.id, rowId))
        .returning({ id: accomplishments.id });
      if (!row) return null;
    } else {
      const [row] = await tx
        .insert(accomplishments)
        .values({ ...base, sortOrder: await firstPosition(accomplishments) })
        .returning({ id: accomplishments.id });
      rowId = row!.id;
    }
    await tx
      .insert(accomplishmentTranslations)
      .values([
        { accomplishmentId: rowId, locale: "en", ...translations.en },
        { accomplishmentId: rowId, locale: "ar", ...translations.ar },
      ])
      .onConflictDoUpdate({
        target: [accomplishmentTranslations.accomplishmentId, accomplishmentTranslations.locale],
        set: { ...excludedSet(Object.keys(translations.en)), updatedAt: new Date() },
      });
    return rowId;
  });
  if (!savedId) return fail("This entry no longer exists.");
  expire(TAGS.accomplishments);
  return ok(base.status === "published" ? "Saved and published." : "Draft saved.", { id: savedId });
}

/* ------------------------------ shared actions ---------------------------- */

const TABLES = {
  education: { table: education, tag: TAGS.education },
  experience: { table: experiences, tag: TAGS.experience },
  accomplishment: { table: accomplishments, tag: TAGS.accomplishments },
} as const;

export async function setEntryStatus(
  kind: EntryKind,
  entryId: string,
  status: "draft" | "published",
): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(entryId).success || !(kind in TABLES)) return fail("Invalid entry.");

  if (status === "published") {
    // Re-validate what's stored, so publishing from a list obeys the same rules as the editor.
    const loaded =
      kind === "education"
        ? await getEducationEditor(entryId)
        : kind === "experience"
          ? await getExperienceEditor(entryId)
          : await getAccomplishmentEditor(entryId);
    if (!loaded) return fail("This entry no longer exists.");
    const schema =
      kind === "education"
        ? educationSchema
        : kind === "experience"
          ? experienceSchema
          : accomplishmentSchema;
    const check = schema.safeParse({ ...loaded.input, status: "published" });
    if (!check.success)
      return fail(`Can't publish yet: ${check.error.issues[0]?.message ?? "check the entry."}`);
  }

  const { table, tag } = TABLES[kind];
  await db.update(table).set({ status }).where(eq(table.id, entryId));
  expire(tag);
  return ok(status === "published" ? "Published." : "Unpublished. It's now a draft.");
}

export async function deleteEntry(kind: EntryKind, entryId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(entryId).success || !(kind in TABLES)) return fail("Invalid entry.");
  const { table, tag } = TABLES[kind];
  await db.delete(table).where(eq(table.id, entryId));
  expire(tag);
  return ok("Deleted.");
}

export async function reorderEntries(kind: EntryKind, ids: string[]): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success || !(kind in TABLES)) return fail("Invalid order.");
  const { table, tag } = TABLES[kind];
  await applyOrder(table, parsed.data.ids);
  expire(tag);
  return ok("Order saved.");
}
