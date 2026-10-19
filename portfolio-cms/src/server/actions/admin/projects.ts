"use server";

import { and, asc, eq, inArray, like, ne } from "drizzle-orm";
import { z } from "zod";

import { fail, ok, validationFailed, type ActionResult } from "@/lib/action-result";
import {
  projectCategorySchema,
  projectImageSchema,
  projectSchema,
  reorderSchema,
} from "@/lib/validation/content";
import {
  applyOrder,
  excludedSet,
  expire,
  lastPosition,
  pgErrorCode,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  replaceLinks,
} from "@/server/admin/helpers";
import { loadProjectInput } from "@/server/admin/queries";
import { authorizeAdmin } from "@/server/auth/guard";
import { TAGS } from "@/server/content/tags";
import { db } from "@/server/db";
import {
  mediaAssets,
  projectCategories,
  projects,
  projectImages,
  projectSkills,
  projectTranslations,
} from "@/server/db/schema";

const id = z.uuid();

function constraintError(error: unknown): ActionResult<never> | null {
  const code = pgErrorCode(error);
  if (code === PG_UNIQUE_VIOLATION) {
    return fail("Another project already uses this URL slug.", { slug: ["This slug is already in use."] });
  }
  if (code === PG_FOREIGN_KEY_VIOLATION) {
    return fail("A selected category or technology no longer exists. Reload the page and try again.");
  }
  return null;
}

export async function saveProject(
  projectId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  if (projectId && !id.safeParse(projectId).success) return fail("Invalid project.");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { translations, skillIds, ...base } = parsed.data;

  try {
    const savedId = await db.transaction(async (tx) => {
      let rowId = projectId;
      if (rowId) {
        const [existing] = await tx
          .select({ publishedAt: projects.publishedAt })
          .from(projects)
          .where(eq(projects.id, rowId));
        if (!existing) throw new Error("NOT_FOUND");
        await tx
          .update(projects)
          .set({
            ...base,
            publishedAt:
              base.status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
          })
          .where(eq(projects.id, rowId));
      } else {
        const [row] = await tx
          .insert(projects)
          .values({
            ...base,
            sortOrder: await lastPosition(projects),
            publishedAt: base.status === "published" ? new Date() : null,
          })
          .returning({ id: projects.id });
        rowId = row!.id;
      }

      const fields = Object.keys(translations.en);
      await tx
        .insert(projectTranslations)
        .values([
          { projectId: rowId, locale: "en", ...translations.en },
          { projectId: rowId, locale: "ar", ...translations.ar },
        ])
        .onConflictDoUpdate({
          target: [projectTranslations.projectId, projectTranslations.locale],
          set: { ...excludedSet(fields), updatedAt: new Date() },
        });

      await replaceLinks(
        tx,
        projectSkills,
        projectSkills.projectId,
        rowId,
        [...new Set(skillIds)].map((skillId, sortOrder) => ({ projectId: rowId, skillId, sortOrder })),
      );
      return rowId;
    });

    expire(TAGS.projects);
    return ok(base.status === "published" ? "Project saved and published." : "Draft saved.", { id: savedId });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND")
      return fail("This project no longer exists.");
    const handled = constraintError(error);
    if (handled) return handled;
    throw error;
  }
}

/** Publish / unpublish from the list. Publishing re-validates the stored project. */
export async function setProjectStatus(
  projectId: string,
  status: "draft" | "published",
): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(projectId).success) return fail("Invalid project.");
  if (status === "published") {
    const stored = await loadProjectInput(projectId);
    if (!stored) return fail("This project no longer exists.");
    const check = projectSchema.safeParse({ ...stored, status: "published" });
    if (!check.success) {
      return fail(
        `Can't publish yet: ${check.error.issues[0]?.message ?? "some required fields are missing."}`,
      );
    }
  }
  const [row] = await db
    .update(projects)
    .set(status === "published" ? { status } : { status })
    .where(eq(projects.id, projectId))
    .returning({ publishedAt: projects.publishedAt });
  if (!row) return fail("This project no longer exists.");
  if (status === "published" && !row.publishedAt) {
    await db.update(projects).set({ publishedAt: new Date() }).where(eq(projects.id, projectId));
  }
  expire(TAGS.projects);
  return ok(status === "published" ? "Project published." : "Project unpublished. It's now a draft.");
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(projectId).success) return fail("Invalid project.");
  await db.delete(projects).where(eq(projects.id, projectId));
  expire(TAGS.projects);
  return ok("Project deleted. Its images stay in the media library.");
}

export async function duplicateProject(projectId: string): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  if (!id.safeParse(projectId).success) return fail("Invalid project.");

  const source = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { translations: true, images: true, skills: true },
  });
  if (!source) return fail("This project no longer exists.");

  // First free "<slug>-copy", "<slug>-copy-2", ...
  const taken = new Set(
    (
      await db
        .select({ slug: projects.slug })
        .from(projects)
        .where(like(projects.slug, `${source.slug}-copy%`))
    ).map((r) => r.slug),
  );
  let slug = `${source.slug}-copy`.slice(0, 80);
  for (let n = 2; taken.has(slug); n++) slug = `${source.slug}-copy-${n}`.slice(0, 80);

  const newId = await db.transaction(async (tx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, translations, images, skills, ...rest } = source;
    const [row] = await tx
      .insert(projects)
      .values({
        ...rest,
        slug,
        status: "draft",
        isFeatured: false,
        publishedAt: null,
        sortOrder: await lastPosition(projects),
      })
      .returning({ id: projects.id });
    const copyId = row!.id;
    if (translations.length) {
      await tx.insert(projectTranslations).values(
        translations.map(({ createdAt: _a, updatedAt: _b, ...t }) => ({
          ...t,
          projectId: copyId,
          title: t.title ? `${t.title} (${t.locale === "ar" ? "نسخة" : "copy"})`.slice(0, 120) : t.title,
        })),
      );
    }
    if (images.length) {
      await tx
        .insert(projectImages)
        .values(
          images.map(({ id: _i, createdAt: _a, updatedAt: _b, ...img }) => ({ ...img, projectId: copyId })),
        );
    }
    if (skills.length) {
      await tx.insert(projectSkills).values(skills.map((s) => ({ ...s, projectId: copyId })));
    }
    return copyId;
  });

  return ok("Project duplicated as a draft.", { id: newId });
}

export async function reorderProjects(ids: string[]): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return fail("Invalid order.");
  await applyOrder(projects, parsed.data.ids);
  expire(TAGS.projects);
  return ok("Order saved.");
}

/* --------------------------------- images --------------------------------- */

export async function addProjectImage(
  projectId: string,
  mediaId: string,
  role: "gallery" | "diagram" = "gallery",
): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(projectId).success || !id.safeParse(mediaId).success) return fail("Invalid image.");
  const [asset] = await db
    .select({ kind: mediaAssets.kind })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaId));
  if (asset?.kind !== "image") return fail("Only images can be added to a project gallery.");

  const existing = await db
    .select({ id: projectImages.id, isCover: projectImages.isCover, sortOrder: projectImages.sortOrder })
    .from(projectImages)
    .where(eq(projectImages.projectId, projectId));
  await db.insert(projectImages).values({
    projectId,
    mediaId,
    role,
    isCover: role === "gallery" && !existing.some((i) => i.isCover),
    sortOrder: existing.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1,
  });
  expire(TAGS.projects);
  return ok("Image added.");
}

export async function updateProjectImage(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = projectImageSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { id: imageId, ...values } = parsed.data;
  await db
    .update(projectImages)
    .set({ ...values, ...(values.role === "diagram" ? { isCover: false } : {}) })
    .where(eq(projectImages.id, imageId));
  expire(TAGS.projects);
  return ok("Image details saved.");
}

export async function setProjectCover(imageId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(imageId).success) return fail("Invalid image.");
  const [image] = await db.select().from(projectImages).where(eq(projectImages.id, imageId));
  if (!image) return fail("This image no longer exists.");
  await db.transaction(async (tx) => {
    await tx
      .update(projectImages)
      .set({ isCover: false })
      .where(and(eq(projectImages.projectId, image.projectId), ne(projectImages.id, imageId)));
    await tx
      .update(projectImages)
      .set({ isCover: true, role: "gallery" })
      .where(eq(projectImages.id, imageId));
  });
  expire(TAGS.projects);
  return ok("Cover image set.");
}

export async function removeProjectImage(imageId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(imageId).success) return fail("Invalid image.");
  const [removed] = await db.delete(projectImages).where(eq(projectImages.id, imageId)).returning();
  if (removed?.isCover) {
    const [next] = await db
      .select({ id: projectImages.id })
      .from(projectImages)
      .where(and(eq(projectImages.projectId, removed.projectId), eq(projectImages.role, "gallery")))
      .orderBy(asc(projectImages.sortOrder))
      .limit(1);
    if (next) await db.update(projectImages).set({ isCover: true }).where(eq(projectImages.id, next.id));
  }
  expire(TAGS.projects);
  return ok("Image removed from the project. The file stays in the media library.");
}

export async function reorderProjectImages(projectId: string, ids: string[]): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success || !id.safeParse(projectId).success) return fail("Invalid order.");
  const owned = await db
    .select({ id: projectImages.id })
    .from(projectImages)
    .where(and(eq(projectImages.projectId, projectId), inArray(projectImages.id, parsed.data.ids)));
  if (owned.length !== parsed.data.ids.length) return fail("Invalid order.");
  await applyOrder(projectImages, parsed.data.ids);
  expire(TAGS.projects);
  return ok("Order saved.");
}

/* ------------------------------- categories ------------------------------- */

export async function saveProjectCategory(
  categoryId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  const parsed = projectCategorySchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  try {
    if (categoryId) {
      if (!id.safeParse(categoryId).success) return fail("Invalid category.");
      await db.update(projectCategories).set(parsed.data).where(eq(projectCategories.id, categoryId));
      expire(TAGS.projects);
      return ok("Category saved.", { id: categoryId });
    }
    const [row] = await db
      .insert(projectCategories)
      .values({ ...parsed.data, sortOrder: await lastPosition(projectCategories) })
      .returning({ id: projectCategories.id });
    expire(TAGS.projects);
    return ok("Category added.", row!);
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return fail("Another category uses this slug.", { slug: ["This slug is already in use."] });
    }
    throw error;
  }
}

export async function deleteProjectCategory(categoryId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(categoryId).success) return fail("Invalid category.");
  await db.delete(projectCategories).where(eq(projectCategories.id, categoryId));
  expire(TAGS.projects);
  return ok("Category deleted. Its projects now have no category.");
}
