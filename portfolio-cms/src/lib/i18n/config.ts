export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/** BCP 47 tags used for date formatting ("Sep 2024"; en-GB would give "Sept 2024"). Arabic uses the Gregorian calendar and Latin digits. */
export const intlLocale: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-SA-u-ca-gregory-nu-latn",
};

export const ogLocale: Record<Locale, string> = {
  en: "en_US",
  ar: "ar_SA",
};
