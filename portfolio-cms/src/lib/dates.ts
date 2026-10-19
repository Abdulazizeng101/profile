import { intlLocale, type Locale } from "@/lib/i18n/config";

/** "2024-09-01" -> "Sep 2024" / "سبتمبر 2024". Dates are calendar dates, so UTC is used to avoid shifting. */
export function formatMonthYear(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale[locale], {
    month: locale === "ar" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatYear(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(intlLocale[locale], { year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** "Sep 2022 – Jun 2026", "Sep 2022 – Present", or a single date. */
export function formatRange(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: Locale,
  presentLabel?: string,
): string {
  const a = formatMonthYear(start, locale);
  const b = end ? formatMonthYear(end, locale) : (presentLabel ?? "");
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

/** Machine-readable value for <time dateTime>. */
export function toDateTime(iso: string | null | undefined): string | undefined {
  return iso ? iso.slice(0, 7) : undefined;
}
