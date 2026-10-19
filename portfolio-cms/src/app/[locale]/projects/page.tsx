import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProjectCard } from "@/components/public/project-card";
import { ProjectBrowser } from "@/components/public/project-browser";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getProjectFilters, getProjects } from "@/server/content/public";

export const instant = true;

export async function generateMetadata({ params }: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "en");
  return {
    title: dict.meta.projectsTitle,
    description: dict.meta.projectsDescription,
    alternates: {
      canonical: `/${locale}/projects`,
      languages: { en: "/en/projects", ar: "/ar/projects" },
    },
  };
}

export default async function ProjectsPage({ params }: PageProps<"/[locale]/projects">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const [projects, filters] = await Promise.all([getProjects(locale), getProjectFilters(locale)]);

  const items = projects.map((project) => ({
    id: project.id,
    category: project.category?.slug ?? null,
    technologies: project.technologies.map((t) => t.name),
    node: <ProjectCard project={project} locale={locale} />,
  }));

  const labels = {
    filters: dict.projects.filters,
    category: dict.projects.category,
    technology: dict.projects.technology,
    allCategories: dict.projects.allCategories,
    allTechnologies: dict.projects.allTechnologies,
    clearFilters: dict.projects.clearFilters,
    noMatches: dict.projects.noMatches,
    resultCount: dict.projects.resultCount,
  };

  const unfiltered = (
    <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id}>{item.node}</div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-14 md:px-8 md:py-20">
      <header className="grid gap-3">
        <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">{dict.projects.all}</h1>
        <p className="text-muted">{dict.projects.count(projects.length)}</p>
      </header>

      {projects.length === 0 ? (
        <p className="text-muted">{dict.projects.empty}</p>
      ) : (
        // The unfiltered grid is the static fallback; filters apply once the URL is read.
        <Suspense fallback={unfiltered}>
          <ProjectBrowser
            items={items}
            categories={filters.categories}
            technologies={filters.technologies}
            labels={labels}
          />
        </Suspense>
      )}
    </div>
  );
}
