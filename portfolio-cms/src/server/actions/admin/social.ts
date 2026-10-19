"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { fail, ok, validationFailed, type ActionResult } from "@/lib/action-result";
import { reorderSchema, socialLinkSchema } from "@/lib/validation/content";
import { applyOrder, expire, lastPosition } from "@/server/admin/helpers";
import { authorizeAdmin } from "@/server/auth/guard";
import { TAGS } from "@/server/content/tags";
import { db } from "@/server/db";
import { socialLinks } from "@/server/db/schema";

export async function saveSocialLink(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await authorizeAdmin();
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  if (id) {
    if (!z.uuid().safeParse(id).success) return fail("Invalid link.");
    const [row] = await db
      .update(socialLinks)
      .set(parsed.data)
      .where(eq(socialLinks.id, id))
      .returning({ id: socialLinks.id });
    if (!row) return fail("This link no longer exists.");
    expire(TAGS.social);
    return ok("Link saved.", row);
  }
  const [row] = await db
    .insert(socialLinks)
    .values({ ...parsed.data, sortOrder: await lastPosition(socialLinks) })
    .returning({ id: socialLinks.id });
  expire(TAGS.social);
  return ok("Link added.", row!);
}

export async function deleteSocialLink(id: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Invalid link.");
  await db.delete(socialLinks).where(eq(socialLinks.id, id));
  expire(TAGS.social);
  return ok("Link deleted.");
}

export async function reorderSocialLinks(ids: string[]): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return fail("Invalid order.");
  await applyOrder(socialLinks, parsed.data.ids);
  expire(TAGS.social);
  return ok("Order saved.");
}
