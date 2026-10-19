import type { ElementType, ReactNode } from "react";

import { Markdown } from "@/components/shared/markdown";
import { dirOf, type Locale } from "@/lib/i18n/config";
import type { LocalText } from "@/lib/types/content";
import { cn } from "@/lib/utils";

/**
 * Attributes for content that may be in a different language from the page
 * (English fallback on the Arabic site): correct lang + direction so screen
 * readers pronounce it properly and Latin text lays out left-to-right.
 */
export function langProps(value: LocalText, pageLocale: Locale) {
  return value.lang === pageLocale ? {} : { lang: value.lang, dir: dirOf(value.lang) };
}

export function Text({
  value,
  locale,
  as: Component = "span",
  className,
}: {
  value: LocalText;
  locale: Locale;
  as?: ElementType;
  className?: string;
}) {
  if (!value.text) return null;
  return (
    <Component className={className} {...langProps(value, locale)}>
      {value.text}
    </Component>
  );
}

export function RichText({
  value,
  locale,
  className,
  fallbackNote,
}: {
  value: LocalText;
  locale: Locale;
  className?: string;
  /** Shown above English content on the Arabic site. */
  fallbackNote?: ReactNode;
}) {
  if (!value.text.trim()) return null;
  const fallback = value.lang !== locale;
  return (
    <div className={cn(fallback && "text-start", className)}>
      {fallback && fallbackNote ? <p className="mb-2 text-2xs text-subtle">{fallbackNote}</p> : null}
      <Markdown {...langProps(value, locale)}>{value.text}</Markdown>
    </div>
  );
}
