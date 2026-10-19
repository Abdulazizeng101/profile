import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { ProjectCardView } from "@/lib/types/content";

import { FeaturedProjectCard, ProjectCard } from "./project-card";
import { Section } from "./section";

const HOME_LIMIT = 5;

export function ProjectsSection({ locale, projects }: { locale: Locale; projects: ProjectCardView[] }) {
  const dict = getDictionary(locale);
  // Featured projects lead; the rest follow in the owner's order.
  const ordered = [...projects.filter((p) => p.isFeatured), ...projects.filter((p) => !p.isFeatured)];
  const shown = ordered.slice(0, HOME_LIMIT);
  const [lead, ...rest] = shown;

  return (
    <Section id="projects" title={dict.sections.projects} meta={dict.projects.count(projects.length)}>
      <div className="grid gap-12">
        {lead ? <FeaturedProjectCard project={lead} locale={locale} /> : null}
        {rest.length > 0 ? (
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
            {rest.map((project) => (
              <ProjectCard key={project.id} project={project} locale={locale} />
            ))}
          </div>
        ) : null}
        {projects.length > 1 ? (
          <Link href={`/${locale}/projects`} className="link w-fit text-sm font-medium">
            {dict.projects.viewAll}
          </Link>
        ) : null}
      </div>
    </Section>
  );
}
