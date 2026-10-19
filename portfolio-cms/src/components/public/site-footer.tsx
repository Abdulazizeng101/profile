import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { SiteData } from "@/server/content/site";

import { CurrentYear } from "./current-year";
import { PLATFORM_NAMES, SocialIcon } from "./icons";
import { langProps } from "./local-text";

export function SiteFooter({ locale, data }: { locale: Locale; data: SiteData }) {
  const dict = getDictionary(locale);
  const name = data.profile.fullName.text;
  const links = data.social.filter((l) => l.showInFooter);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 md:grid-cols-[1fr_auto] md:items-end md:px-8">
        <div className="grid gap-2">
          {name ? <p className="heading text-base font-semibold">{name}</p> : null}
          {data.settings.footerNote.text ? (
            <p className="max-w-[52ch] text-sm text-muted" {...langProps(data.settings.footerNote, locale)}>
              {data.settings.footerNote.text}
            </p>
          ) : null}
          <p className="text-xs text-subtle">
            © <CurrentYear /> {name}. {dict.footer.rights}
          </p>
        </div>

        <div className="grid gap-4 md:justify-items-end">
          {data.sections.length > 0 ? (
            <nav aria-label={dict.nav.label}>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                {data.sections.map((key) => (
                  <li key={key}>
                    <Link href={`/${locale}#${key}`} className="hover:text-fg">
                      {dict.nav[key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer me"
                className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <SocialIcon platform={link.platform} />
                <span className="sr-only">{link.label || PLATFORM_NAMES[link.platform]}</span>
              </a>
            ))}
            <a
              href="#main"
              className="ms-2 inline-flex h-9 items-center rounded-[var(--radius)] px-2 text-sm text-muted hover:text-fg"
            >
              {dict.footer.backToTop}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
