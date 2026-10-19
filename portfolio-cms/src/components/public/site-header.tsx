import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { SectionKey } from "@/lib/types/content";

import { LanguageSwitch } from "./language-switch";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({
  locale,
  name,
  sections,
  arabicEnabled,
}: {
  locale: Locale;
  name: string;
  sections: SectionKey[];
  arabicEnabled: boolean;
}) {
  const dict = getDictionary(locale);
  const links = sections.map((key) => ({ href: `/${locale}#${key}`, label: dict.nav[key] }));

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-[color-mix(in_oklab,var(--bg)_86%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1200px] items-center gap-6 px-5 md:px-8">
        <Link
          href={`/${locale}`}
          className="heading me-auto truncate text-base font-semibold tracking-tight"
          aria-label={name ? `${name}, ${dict.nav.home}` : dict.nav.home}
        >
          {name || dict.nav.home}
        </Link>

        <nav aria-label={dict.nav.label} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          {arabicEnabled ? (
            <LanguageSwitch
              locale={locale}
              labels={{
                en: dict.controls.switchToEnglish,
                ar: dict.controls.switchToArabic,
                title: dict.controls.language,
              }}
            />
          ) : null}
          <ThemeToggle labels={{ dark: dict.controls.themeDark, light: dict.controls.themeLight }} />
          <MobileNav
            links={links}
            labels={{ open: dict.nav.openMenu, close: dict.nav.closeMenu, nav: dict.nav.label }}
          />
        </div>
      </div>
    </header>
  );
}
