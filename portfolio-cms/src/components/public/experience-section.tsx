import { ArrowUpRight } from "lucide-react";

import { ResponsiveImage } from "@/components/shared/responsive-image";
import { formatMonthYear, formatRange, toDateTime } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { ExperienceView } from "@/lib/types/content";
import { cn } from "@/lib/utils";

import { langProps, RichText, Text } from "./local-text";
import { TechList } from "./project-card";
import { Section } from "./section";

export function ExperienceSection({ locale, items }: { locale: Locale; items: ExperienceView[] }) {
  const dict = getDictionary(locale);
  // Planned roles are listed separately and never mixed with past or current work.
  const actual = items.filter((i) => i.state !== "planned");
  const upcoming = items.filter((i) => i.state === "planned");

  return (
    <Section id="experience" title={dict.sections.experience}>
      <div className="grid gap-14">
        {actual.length > 0 ? (
          <ol className="grid gap-12">
            {actual.map((item) => (
              <ExperienceItem key={item.id} item={item} locale={locale} />
            ))}
          </ol>
        ) : null}

        {upcoming.length > 0 ? (
          <div className="grid gap-6 rounded-[var(--radius-lg)] border border-dashed border-border-strong p-6">
            <div>
              <h3 className="heading text-lg">{dict.experience.upcoming}</h3>
              <p className="text-sm text-subtle">{dict.experience.upcomingNote}</p>
            </div>
            <ol className="grid gap-8">
              {upcoming.map((item) => (
                <ExperienceItem key={item.id} item={item} locale={locale} />
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function ExperienceItem({ item, locale }: { item: ExperienceView; locale: Locale }) {
  const dict = getDictionary(locale);
  const note = dict.content.englishOnly;
  const when =
    item.state === "planned"
      ? item.startDate
        ? `${dict.experience.startsOn} ${formatMonthYear(item.startDate, locale)}`
        : dict.experience.dateTbd
      : formatRange(
          item.startDate,
          item.state === "current" ? null : item.endDate,
          locale,
          dict.experience.present,
        );
  const location = [item.location.text, item.isRemote ? dict.experience.remote : ""]
    .filter(Boolean)
    .join(" / ");

  return (
    <li className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
      <div className="text-sm text-subtle md:pt-1">
        <time dateTime={toDateTime(item.startDate)}>{when}</time>
      </div>
      <article className="grid gap-4">
        <header className="flex items-start gap-4">
          {item.logo ? (
            <ResponsiveImage
              image={item.logo}
              alt=""
              sizes="40px"
              className="mt-1 size-10 shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface object-contain p-1"
            />
          ) : null}
          <div className="grid gap-1">
            <h3 className="heading text-xl" {...langProps(item.role, locale)}>
              {item.role.text}
            </h3>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex items-center gap-1 text-fg"
                >
                  <Text value={item.organization} locale={locale} />
                  <ArrowUpRight className="size-3.5 text-subtle" aria-hidden="true" />
                </a>
              ) : (
                <Text value={item.organization} locale={locale} className="text-fg" />
              )}
              <span>{dict.experience.type[item.type as keyof typeof dict.experience.type]}</span>
              {location ? <span>{location}</span> : null}
              {item.state === "current" ? (
                <span className="inline-flex items-center gap-1.5 text-fg">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
                  {dict.experience.current}
                </span>
              ) : null}
              {item.isDraft ? (
                <span className="rounded-full border border-accent-line px-2 py-0.5 text-xs text-fg">
                  {dict.preview.draft}
                </span>
              ) : null}
            </p>
          </div>
        </header>
        <RichText value={item.description} locale={locale} fallbackNote={note} />
        <SubList
          title={dict.experience.responsibilities}
          value={item.responsibilities}
          locale={locale}
          note={note}
        />
        <SubList title={dict.experience.achievements} value={item.achievements} locale={locale} note={note} />
        <TechList items={item.technologies} />
      </article>
    </li>
  );
}

function SubList({
  title,
  value,
  locale,
  note,
}: {
  title: string;
  value: ExperienceView["description"];
  locale: Locale;
  note: string;
}) {
  if (!value.text.trim()) return null;
  return (
    <div className={cn("grid gap-2")}>
      <h4 className="text-sm font-semibold text-subtle">{title}</h4>
      <RichText value={value} locale={locale} fallbackNote={note} className="text-[0.975rem]" />
    </div>
  );
}
