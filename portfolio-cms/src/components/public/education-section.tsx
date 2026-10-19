import { ResponsiveImage } from "@/components/shared/responsive-image";
import { formatMonthYear, formatRange, toDateTime } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { EducationView } from "@/lib/types/content";

import { langProps, RichText, Text } from "./local-text";
import { Section } from "./section";

export function EducationSection({ locale, items }: { locale: Locale; items: EducationView[] }) {
  const dict = getDictionary(locale);
  const note = dict.content.englishOnly;

  return (
    <Section id="education" title={dict.sections.education}>
      <ol className="grid gap-12">
        {items.map((item) => {
          const inProgress = item.educationStatus === "in_progress";
          const when = inProgress
            ? [
                formatMonthYear(item.startDate, locale),
                item.endDate
                  ? `${dict.education.expected} ${formatMonthYear(item.endDate, locale)}`
                  : dict.education.inProgress,
              ]
                .filter(Boolean)
                .join(" – ")
            : formatRange(item.startDate, item.endDate, locale);
          const degree = [item.degree.text, item.field.text]
            .filter(Boolean)
            .join(locale === "ar" ? " في " : " in ");

          return (
            <li key={item.id} className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
              <div className="text-sm text-subtle md:pt-1">
                {when ? <time dateTime={toDateTime(item.endDate ?? item.startDate)}>{when}</time> : null}
              </div>
              <article className="grid gap-4">
                <header className="flex items-start gap-4">
                  {item.logo ? (
                    <ResponsiveImage
                      image={item.logo}
                      alt=""
                      sizes="48px"
                      className="mt-1 size-12 shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface object-contain p-1"
                    />
                  ) : null}
                  <div className="grid gap-1">
                    <h3 className="heading text-xl" {...langProps(item.degree, locale)}>
                      {degree}
                    </h3>
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="link text-fg">
                          <Text value={item.institution} locale={locale} />
                        </a>
                      ) : (
                        <Text value={item.institution} locale={locale} className="text-fg" />
                      )}
                      <Text value={item.location} locale={locale} />
                      {item.grade ? (
                        <span>
                          {dict.education.grade}: <span dir="ltr">{item.grade}</span>
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
                {item.courses.text ? (
                  <div className="grid gap-2">
                    <h4 className="text-sm font-semibold text-subtle">{dict.education.courses}</h4>
                    <RichText
                      value={item.courses}
                      locale={locale}
                      fallbackNote={note}
                      className="text-[0.975rem]"
                    />
                  </div>
                ) : null}
                {item.honors.text ? (
                  <div className="grid gap-2">
                    <h4 className="text-sm font-semibold text-subtle">{dict.education.honors}</h4>
                    <RichText
                      value={item.honors}
                      locale={locale}
                      fallbackNote={note}
                      className="text-[0.975rem]"
                    />
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
