"use server";

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

/** Leaving preview needs no session: it only removes the preview cookie. */
export async function exitPreview(formData: FormData) {
  (await draftMode()).disable();
  const locale = formData.get("locale");
  redirect(`/${isLocale(locale) ? locale : "en"}`);
}
