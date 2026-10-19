"use server";

import { eq } from "drizzle-orm";

import { fail, ok, validationFailed, type ActionResult } from "@/lib/action-result";
import {
  appearanceSchema,
  contactSettingsSchema,
  localizationSchema,
  seoSchema,
} from "@/lib/validation/content";
import { excludedSet, expire } from "@/server/admin/helpers";
import { authorizeAdmin } from "@/server/auth/guard";
import { TAGS, type Tag } from "@/server/content/tags";
import { db } from "@/server/db";
import { mediaAssets, siteSettings, siteSettingsTranslations } from "@/server/db/schema";

async function ensureSettings() {
  await db.insert(siteSettings).values({ id: 1 }).onConflictDoNothing();
}

async function upsertSettingsText(translations: Record<"en" | "ar", Record<string, string>>) {
  const fields = Object.keys(translations.en);
  await db
    .insert(siteSettingsTranslations)
    .values([
      { settingsId: 1, locale: "en", ...translations.en },
      { settingsId: 1, locale: "ar", ...translations.ar },
    ])
    .onConflictDoUpdate({
      target: [siteSettingsTranslations.settingsId, siteSettingsTranslations.locale],
      set: { ...excludedSet(fields), updatedAt: new Date() },
    });
}

export async function saveAppearance(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  await ensureSettings();
  await db.update(siteSettings).set(parsed.data).where(eq(siteSettings.id, 1));
  expire(TAGS.settings);
  return ok("Appearance saved.");
}

export async function saveContactSettings(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = contactSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  await ensureSettings();
  await db
    .update(siteSettings)
    .set({ contactFormEnabled: parsed.data.contactFormEnabled })
    .where(eq(siteSettings.id, 1));
  await upsertSettingsText(parsed.data.translations);
  expire(TAGS.settings);
  return ok("Contact settings saved.");
}

export async function saveSeo(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = seoSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  const { translations, ...base } = parsed.data;
  if (base.ogImageId) {
    const [asset] = await db
      .select({ kind: mediaAssets.kind })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, base.ogImageId));
    if (asset?.kind !== "image") return fail("Choose an image for social sharing.");
  }
  await ensureSettings();
  await db.update(siteSettings).set(base).where(eq(siteSettings.id, 1));
  await upsertSettingsText(translations);
  expire(TAGS.settings);
  return ok("SEO settings saved.");
}

export async function saveLocalization(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = localizationSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);
  await ensureSettings();
  await db.update(siteSettings).set(parsed.data).where(eq(siteSettings.id, 1));
  expire(TAGS.settings);
  return ok("Language settings saved.");
}

/**
 * Expires every public cache tag. Ordinary saves already do this for what they
 * change; this is for content changed outside the dashboard (a restore with
 * `pnpm content:import`, or a manual database edit).
 */
export async function refreshPublicSite(): Promise<ActionResult> {
  await authorizeAdmin();
  expire(...(Object.values(TAGS) as Tag[]));
  return ok("Public site refreshed. Visitors now see the latest content.");
}
