"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";

/** Links to the same page in the other language. */
export function LanguageSwitch({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { en: string; ar: string; title: string };
}) {
  const pathname = usePathname() || `/${locale}`;
  const target: Locale = locale === "en" ? "ar" : "en";
  const href = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${target}`);

  function remember() {
    document.cookie = `locale=${target}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      onClick={remember}
      title={labels.title}
      className="inline-flex h-9 items-center rounded-[var(--radius)] px-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {target === "ar" ? labels.ar : labels.en}
    </Link>
  );
}
