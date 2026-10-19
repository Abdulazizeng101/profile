import Link from "next/link";
import { locale as localeParam } from "next/root-params";

import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";

export default async function NotFound() {
  const raw = await localeParam();
  const locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return (
    <div className="mx-auto grid max-w-[1200px] gap-4 px-5 py-28 md:px-8 md:py-40">
      <p className="display text-8xl text-border-strong">404</p>
      <h1 className="heading text-3xl">{dict.errors.notFoundTitle}</h1>
      <p className="text-lg text-muted">{dict.errors.notFoundText}</p>
      <p className="pt-2">
        <Link href={`/${locale}`} className="link font-medium">
          {dict.errors.goHome}
        </Link>
      </p>
    </div>
  );
}
