"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { hasTechIcon } from "@/components/public/icons";
import { fail, ok, validationFailed, type ActionResult } from "@/lib/action-result";
import { reorderSchema, skillCategorySchema, skillSchema } from "@/lib/validation/content";
import { applyOrder, expire, lastPosition, pgErrorCode, PG_UNIQUE_VIOLATION } from "@/server/admin/helpers";
import { authorizeAdmin } from "@/server/auth/guard";
import { TAGS } from "@/server/content/tags";
import { db } from "@/server/db";
import { skillCategories, skills } from "@/server/db/schema";

const id = z.uuid();

export async function saveSkillCategory(
  categoryId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  const parsed = skillCategorySchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  if (categoryId) {
    if (!id.safeParse(categoryId).success) return fail("Invalid category.");
    await db.update(skillCategories).set(parsed.data).where(eq(skillCategories.id, categoryId));
    expire(TAGS.skills);
    return ok("Category saved.", { id: categoryId });
  }
  const [row] = await db
    .insert(skillCategories)
    .values({ ...parsed.data, sortOrder: await lastPosition(skillCategories) })
    .returning({ id: skillCategories.id });
  expire(TAGS.skills);
  return ok("Category added.", row!);
}

export async function deleteSkillCategory(categoryId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(categoryId).success) return fail("Invalid category.");
  await db.delete(skillCategories).where(eq(skillCategories.id, categoryId));
  expire(TAGS.skills);
  return ok("Category deleted. Its skills moved to Uncategorized.");
}

export async function reorderSkillCategories(ids: string[]): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return fail("Invalid order.");
  await applyOrder(skillCategories, parsed.data.ids);
  expire(TAGS.skills);
  return ok("Order saved.");
}

export async function saveSkill(
  skillId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  const parsed = skillSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  if (parsed.data.iconSlug && !hasTechIcon(parsed.data.iconSlug)) {
    return fail("Unknown icon.", {
      iconSlug: ["No icon has this slug. Look it up on simpleicons.org, or leave it empty."],
    });
  }
  try {
    if (skillId) {
      if (!id.safeParse(skillId).success) return fail("Invalid skill.");
      await db.update(skills).set(parsed.data).where(eq(skills.id, skillId));
      expire(TAGS.skills, TAGS.projects, TAGS.experience);
      return ok("Skill saved.", { id: skillId });
    }
    const [row] = await db
      .insert(skills)
      .values({ ...parsed.data, sortOrder: await lastPosition(skills) })
      .returning({ id: skills.id });
    expire(TAGS.skills);
    return ok("Skill added.", row!);
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return fail("You already have a skill with this name.", { name: ["This skill already exists."] });
    }
    throw error;
  }
}

/**
 * Used by technology pickers in the project and experience editors: returns
 * the existing skill with this name or creates a hidden one (not shown in the
 * Skills section until you choose to show it).
 */
export async function findOrCreateSkill(name: string): Promise<ActionResult<{ id: string; name: string }>> {
  await authorizeAdmin();
  const parsed = z.string().trim().min(1).max(60).safeParse(name);
  if (!parsed.success) return fail("Enter a technology name under 60 characters.");
  const [existing] = await db
    .select({ id: skills.id, name: skills.name })
    .from(skills)
    .where(sql`lower(${skills.name}) = lower(${parsed.data})`);
  if (existing) return ok(undefined, existing);
  const [row] = await db
    .insert(skills)
    .values({ name: parsed.data, isVisible: false, sortOrder: await lastPosition(skills) })
    .returning({ id: skills.id, name: skills.name });
  return ok(`Added "${row!.name}" to your skills (hidden from the Skills section).`, row!);
}

export async function deleteSkill(skillId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!id.safeParse(skillId).success) return fail("Invalid skill.");
  await db.delete(skills).where(eq(skills.id, skillId));
  expire(TAGS.skills, TAGS.projects, TAGS.experience);
  return ok("Skill deleted.");
}

export async function reorderSkills(ids: string[]): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return fail("Invalid order.");
  await applyOrder(skills, parsed.data.ids);
  expire(TAGS.skills);
  return ok("Order saved.");
}
