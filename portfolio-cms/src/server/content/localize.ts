import type { Locale } from "@/lib/i18n/config";
import type { LocalText } from "@/lib/types/content";

export type FallbackMode = "english" | "hide";

type TranslationRow = { locale: "en" | "ar" } & Record<string, unknown>;

/**
 * Picks a field in the requested language. When Arabic is requested but
 * missing, the English text is returned (marked lang="en") if the site's
 * fallback mode allows it. Content is never machine-translated.
 */
export function pick<R extends TranslationRow>(
  rows: R[],
  locale: Locale,
  field: keyof R & string,
  mode: FallbackMode,
): LocalText {
  const own = rows.find((r) => r.locale === locale)?.[field];
  if (typeof own === "string" && own.trim()) return { text: own, lang: locale };
  if (locale !== "en" && mode === "english") {
    const en = rows.find((r) => r.locale === "en")?.[field];
    if (typeof en === "string" && en.trim()) return { text: en, lang: "en" };
  }
  return { text: "", lang: locale };
}

/** Builds a picker bound to one entity's translation rows. */
export function picker<R extends TranslationRow>(rows: R[], locale: Locale, mode: FallbackMode) {
  return (field: keyof R & string) => pick(rows, locale, field, mode);
}

/** Short paired labels (nameEn / nameAr). */
export function pickLabel(en: string, ar: string, locale: Locale): LocalText {
  if (locale === "ar" && ar.trim()) return { text: ar, lang: "ar" };
  return { text: en, lang: "en" };
}

/** True when an entity has its primary text in the requested language. */
export function hasOwnTranslation<R extends TranslationRow>(
  rows: R[],
  locale: Locale,
  field: keyof R & string,
) {
  const value = rows.find((r) => r.locale === locale)?.[field];
  return typeof value === "string" && value.trim().length > 0;
}
