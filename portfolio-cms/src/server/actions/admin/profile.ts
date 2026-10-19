"use server";

import { eq } from "drizzle-orm";

import { fail, ok, validationFailed, type ActionResult } from "@/lib/action-result";
import { aboutSchema, profileMediaSchema, profileSchema } from "@/lib/validation/content";
import { excludedSet, expire } from "@/server/admin/helpers";
import { authorizeAdmin } from "@/server/auth/guard";
import { TAGS } from "@/server/content/tags";
import { db } from "@/server/db";
import { mediaAssets, profile, profileTranslations } from "@/server/db/schema";

async function ensureProfile() {
  await db.insert(profile).values({ id: 1 }).onConflictDoNothing();
}

export async function saveProfile(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { translations, ...base } = parsed.data;

  await ensureProfile();
  await db.transaction(async (tx) => {
    await tx.update(profile).set(base).where(eq(profile.id, 1));
    const fields = Object.keys(translations.en);
    await tx
      .insert(profileTranslations)
      .values([
        { profileId: 1, locale: "en", ...translations.en },
        { profileId: 1, locale: "ar", ...translations.ar },
      ])
      .onConflictDoUpdate({
        target: [profileTranslations.profileId, profileTranslations.locale],
        set: { ...excludedSet(fields), updatedAt: new Date() },
      });
  });
  expire(TAGS.profile);
  return ok("Profile saved.");
}

export async function saveAbout(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = aboutSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { translations } = parsed.data;

  await ensureProfile();
  const fields = Object.keys(translations.en);
  await db
    .insert(profileTranslations)
    .values([
      { profileId: 1, locale: "en", ...translations.en },
      { profileId: 1, locale: "ar", ...translations.ar },
    ])
    .onConflictDoUpdate({
      target: [profileTranslations.profileId, profileTranslations.locale],
      set: { ...excludedSet(fields), updatedAt: new Date() },
    });
  expire(TAGS.profile);
  return ok("About section saved.");
}

/** Sets or clears the profile photo or a CV. */
export async function setProfileMedia(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = profileMediaSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid file reference.");
  const { field, mediaId } = parsed.data;

  if (mediaId) {
    const [asset] = await db
      .select({ kind: mediaAssets.kind })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, mediaId));
    const expected = field === "photoId" ? "image" : "document";
    if (!asset || asset.kind !== expected)
      return fail(expected === "image" ? "Choose an image." : "Choose a PDF.");
  }

  await ensureProfile();
  await db
    .update(profile)
    .set({ [field]: mediaId, updatedAt: new Date() })
    .where(eq(profile.id, 1));
  expire(TAGS.profile);
  const labels = { photoId: "Profile photo", cvEnId: "English CV", cvArId: "Arabic CV" } as const;
  return ok(mediaId ? `${labels[field]} updated.` : `${labels[field]} removed.`);
}
