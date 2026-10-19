import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { SkillGroupView } from "@/lib/types/content";

import { TechIcon } from "./icons";
import { langProps } from "./local-text";
import { Section } from "./section";

export function SkillsSection({ locale, groups }: { locale: Locale; groups: SkillGroupView[] }) {
  const dict = getDictionary(locale);
  return (
    <Section id="skills" title={dict.sections.skills}>
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="grid content-start gap-4">
            <h3
              className="border-b border-border pb-2 text-sm font-semibold text-subtle"
              {...langProps(group.name, locale)}
            >
              {group.name.text}
            </h3>
            <ul className="grid gap-2.5">
              {group.skills.map((skill) => (
                <li key={skill.id} className="flex items-baseline justify-between gap-4">
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-4 items-center justify-center self-center text-muted">
                      <TechIcon slug={skill.iconSlug} />
                    </span>
                    <span dir="auto">{skill.name}</span>
                  </span>
                  {skill.proficiency ? (
                    <span className="text-xs text-subtle">
                      {dict.skills.proficiency[skill.proficiency as keyof typeof dict.skills.proficiency]}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
