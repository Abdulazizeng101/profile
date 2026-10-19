import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { ProfileView } from "@/lib/types/content";

import { langProps, RichText } from "./local-text";
import { Section } from "./section";

export function AboutSection({ locale, profile }: { locale: Locale; profile: ProfileView }) {
  const dict = getDictionary(locale);
  const note = dict.content.englishOnly;
  const blocks = [
    { title: dict.about.disciplines, value: profile.disciplines },
    { title: dict.about.interests, value: profile.interests },
    { title: dict.about.careerGoals, value: profile.careerGoals },
  ].filter((b) => b.value.text.trim());

  return (
    <Section id="about" title={dict.sections.about}>
      <div className="grid gap-12">
        {profile.personalStatement.text ? (
          <p
            className="heading max-w-[34ch] text-xl leading-snug text-balance md:text-2xl md:leading-snug"
            {...langProps(profile.personalStatement, locale)}
          >
            {profile.personalStatement.text}
          </p>
        ) : null}

        <RichText value={profile.bio} locale={locale} fallbackNote={note} className="text-lg" />

        {blocks.length > 0 ? (
          <div className="grid gap-x-10 gap-y-8 border-t border-border pt-10 md:grid-cols-2 xl:grid-cols-3">
            {blocks.map((block) => (
              <div key={block.title} className="grid content-start gap-3">
                <h3 className="text-sm font-semibold text-subtle">{block.title}</h3>
                <RichText
                  value={block.value}
                  locale={locale}
                  fallbackNote={note}
                  className="text-[0.975rem]"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}
