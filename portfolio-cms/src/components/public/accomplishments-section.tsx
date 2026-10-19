import { ArrowUpRight, FileText } from "lucide-react";

import { formatMonthYear, toDateTime } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { AccomplishmentView } from "@/lib/types/content";

import { langProps, RichText, Text } from "./local-text";
import { Section } from "./section";

const KIND_ORDER: AccomplishmentView["kind"][] = [
  "certification",
  "award",
  "competition",
  "course",
  "publication",
  "volunteer",
];

export function AccomplishmentsSection({
  locale,
  items,
  today,
}: {
  locale: Locale;
  items: AccomplishmentView[];
  today: string;
}) {
  const dict = getDictionary(locale);
  // Only kinds with entries get a heading; empty groups never render.
  const groups = KIND_ORDER.map((kind) => ({ kind, entries: items.filter((i) => i.kind === kind) })).filter(
    (g) => g.entries.length > 0,
  );

  return (
    <Section id="accomplishments" title={dict.sections.accomplishments}>
      <div className="grid gap-12">
        {groups.map((group) => (
          <div key={group.kind} className="grid gap-4">
            <h3 className="border-b border-border pb-2 text-sm font-semibold text-subtle">
              {dict.accomplishments.kinds[group.kind]}
            </h3>
            <ul className="grid gap-6">
              {group.entries.map((item) => {
                const expired = Boolean(item.expiresOn && item.expiresOn < today);
                return (
                  <li key={item.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
                    <div className="grid gap-1">
                      <p className="font-medium" {...langProps(item.title, locale)}>
                        {item.title.text}
                        {item.isDraft ? (
                          <span className="ms-2 rounded-full border border-accent-line px-2 py-0.5 text-xs font-normal">
                            {dict.preview.draft}
                          </span>
                        ) : null}
                      </p>
                      <p className="flex flex-wrap gap-x-3 text-sm text-muted">
                        <Text value={item.issuer} locale={locale} />
                        {item.credentialId ? (
                          <span>
                            {dict.accomplishments.credentialId}: <span dir="ltr">{item.credentialId}</span>
                          </span>
                        ) : null}
                        {item.expiresOn ? (
                          <span>
                            {expired ? dict.accomplishments.expired : dict.accomplishments.expires}{" "}
                            {formatMonthYear(item.expiresOn, locale)}
                          </span>
                        ) : null}
                      </p>
                      <RichText
                        value={item.description}
                        locale={locale}
                        fallbackNote={dict.content.englishOnly}
                        className="mt-1 text-sm"
                      />
                      <div className="mt-1 flex flex-wrap gap-4 text-sm">
                        {item.credentialUrl ? (
                          <a
                            href={item.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link inline-flex items-center gap-1"
                          >
                            {dict.accomplishments.credential}
                            <ArrowUpRight className="size-3.5 text-subtle" aria-hidden="true" />
                          </a>
                        ) : null}
                        {item.document ? (
                          <a
                            href={item.document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link inline-flex items-center gap-1"
                          >
                            <FileText className="size-3.5 text-subtle" aria-hidden="true" />
                            {dict.accomplishments.document}
                          </a>
                        ) : null}
                      </div>
                    </div>
                    {item.issuedOn ? (
                      <time dateTime={toDateTime(item.issuedOn)} className="text-sm text-subtle md:text-end">
                        {formatMonthYear(item.issuedOn, locale)}
                      </time>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
