import { ArrowDown, Download } from "lucide-react";
import Link from "next/link";

import { ResponsiveImage } from "@/components/shared/responsive-image";
import { formatMonthYear } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { LocalText } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import type { SiteData } from "@/server/content/site";

import { PLATFORM_NAMES, SocialIcon } from "./icons";
import { langProps, Text } from "./local-text";

/**
 * The first screen. The portrait sits inside drafting crop marks above a
 * "title block": the information panel of an engineering drawing, here
 * carrying role, base, availability and languages.
 */
export function Hero({ locale, data, updatedAt }: { locale: Locale; data: SiteData; updatedAt: string }) {
  const dict = getDictionary(locale);
  const { profile, settings } = data;
  const heroLinks = data.social.filter((l) => l.showInHero);
  const showProjects = settings.showProjectsButton && data.projects.length > 0;
  const showCv = settings.showCvButton && profile.cv.available;
  const showContact = settings.showContactButton && data.sections.includes("contact");

  const availabilityText: LocalText | null = profile.availability
    ? profile.availability.kind === "custom" || profile.availability.label.text
      ? profile.availability.label
      : { text: dict.availability[profile.availability.kind as keyof typeof dict.availability], lang: locale }
    : null;

  const rows: { label: string; value: LocalText; status?: boolean }[] = [];
  if (profile.headline.text) rows.push({ label: dict.hero.role, value: profile.headline });
  if (profile.location?.text) rows.push({ label: dict.hero.basedIn, value: profile.location });
  if (availabilityText?.text) rows.push({ label: dict.hero.status, value: availabilityText, status: true });
  if (profile.languages.text) rows.push({ label: dict.hero.languages, value: profile.languages });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* Soft accent light behind the name; purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute start-[-10%] -top-40 h-[36rem] w-[52rem] rounded-full opacity-[var(--glow-strength)] blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
      />
      <div aria-hidden="true" className="hero-grain" />
      <div className="relative mx-auto grid max-w-[1200px] gap-12 px-5 pt-14 pb-16 md:px-8 md:pt-20 md:pb-24 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <div className="grid gap-7">
          <h1 id="hero-title" className="display text-[clamp(2.75rem,8vw,6rem)] text-balance">
            {profile.fullName.text ? (
              <span {...langProps(profile.fullName, locale)}>{profile.fullName.text}</span>
            ) : (
              <Text value={profile.headline} locale={locale} />
            )}
          </h1>

          {profile.fullName.text && profile.headline.text ? (
            <p className="heading text-xl text-muted md:text-2xl" {...langProps(profile.headline, locale)}>
              {profile.headline.text}
            </p>
          ) : null}

          {profile.intro.text ? (
            <p
              className="measure text-lg text-pretty text-[color-mix(in_oklab,var(--fg)_86%,var(--muted))]"
              {...langProps(profile.intro, locale)}
            >
              {profile.intro.text}
            </p>
          ) : null}

          {showProjects || showCv || showContact ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {showProjects ? (
                <Link
                  href={`/${locale}#projects`}
                  className="inline-flex h-12 items-center gap-2 rounded-[var(--radius)] bg-accent px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_88%,var(--fg))]"
                >
                  {dict.hero.viewProjects}
                  <ArrowDown className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {showCv ? (
                <a
                  href={`/cv?lang=${locale}`}
                  className="inline-flex h-12 items-center gap-2 rounded-[var(--radius)] border border-border-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-[var(--muted)] hover:bg-surface-2"
                  {...(profile.cv.lang && profile.cv.lang !== locale ? { hrefLang: profile.cv.lang } : {})}
                >
                  <Download className="size-4" aria-hidden="true" />
                  {dict.hero.downloadCv}
                  {profile.cv.lang && profile.cv.lang !== locale ? (
                    <span className="text-xs text-subtle">(EN)</span>
                  ) : null}
                </a>
              ) : null}
              {showContact ? (
                <Link href={`/${locale}#contact`} className="link px-2 text-sm font-medium">
                  {dict.hero.contact}
                </Link>
              ) : null}
            </div>
          ) : null}

          {heroLinks.length > 0 ? (
            <ul aria-label={dict.hero.profiles} className="-ms-2 flex flex-wrap items-center gap-1">
              {heroLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] px-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <SocialIcon platform={link.platform} />
                    <span>{link.label || PLATFORM_NAMES[link.platform]}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid w-full max-w-md gap-0 justify-self-start lg:justify-self-end">
          {profile.photo ? (
            <figure className="crop-marks relative mb-8 aspect-[4/5] w-full max-w-[22rem]">
              <ResponsiveImage
                image={profile.photo}
                alt={profile.photo.alt || profile.fullName.text}
                sizes="(min-width: 1024px) 352px, (min-width: 640px) 60vw, 85vw"
                priority
                className="h-full w-full rounded-[var(--radius-sm)] object-cover object-top"
              />
            </figure>
          ) : null}

          <dl className="title-block w-full max-w-[22rem] overflow-hidden rounded-[var(--radius-sm)] border border-border-strong text-sm">
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "title-block-row grid grid-cols-[6.5rem_1fr] gap-3 px-4 py-2.5",
                  i > 0 && "border-t border-border",
                )}
                style={{ animationDelay: `${300 + i * 70}ms` }}
              >
                <dt className="text-xs leading-6 text-subtle">{row.label}</dt>
                <dd className="flex items-center gap-2 font-medium" {...langProps(row.value, locale)}>
                  {row.status ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        profile.availability?.kind === "not_looking" ? "bg-subtle" : "bg-accent",
                      )}
                    />
                  ) : null}
                  {row.value.text}
                </dd>
              </div>
            ))}
            <div className="title-block-row flex items-center justify-between border-t border-border-strong bg-surface-2 px-4 py-2 text-xs text-subtle">
              <dt>{dict.hero.updated}</dt>
              <dd>
                <time dateTime={updatedAt.slice(0, 7)}>
                  {formatMonthYear(updatedAt.slice(0, 10), locale)}
                </time>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
