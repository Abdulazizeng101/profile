import Link from "next/link";

import { ResponsiveImage } from "@/components/shared/responsive-image";
import { formatYear } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { ProjectCardView } from "@/lib/types/content";
import { cn } from "@/lib/utils";

import { langProps } from "./local-text";

export function TechList({
  items,
  className,
}: {
  items: { id: string; name: string }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-subtle", className)}>
      {items.map((t) => (
        <li key={t.id} dir="auto">
          {t.name}
        </li>
      ))}
    </ul>
  );
}

function Meta({ project, locale }: { project: ProjectCardView; locale: Locale }) {
  const dict = getDictionary(locale);
  const year = formatYear(project.endDate ?? project.startDate, locale);
  const parts = [
    project.category?.name,
    project.stage !== "completed" ? dict.projects.stage[project.stage] : null,
    year,
  ].filter(Boolean);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
      {project.isDraft ? (
        <span className="rounded-full border border-accent-line px-2 py-0.5 text-fg">
          {dict.preview.draft}
        </span>
      ) : null}
      {parts.map((part) => (
        <span key={String(part)}>{part}</span>
      ))}
    </p>
  );
}

/** Large, horizontal card used for the lead project. */
export function FeaturedProjectCard({ project, locale }: { project: ProjectCardView; locale: Locale }) {
  const dict = getDictionary(locale);
  const href = `/${locale}/projects/${project.slug}`;
  return (
    <article className="group panel grid overflow-hidden md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[16/10] overflow-hidden bg-surface-2 md:aspect-auto md:min-h-[22rem]"
      >
        {project.cover ? (
          <ResponsiveImage
            image={project.cover}
            alt=""
            sizes="(min-width: 1200px) 520px, (min-width: 768px) 50vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-[1.02]"
          />
        ) : (
          <Placeholder title={project.title.text} />
        )}
      </Link>
      <div className="grid content-between gap-6 p-6 md:p-8">
        <div className="grid gap-3">
          <Meta project={project} locale={locale} />
          <h3 className="heading text-2xl text-balance" {...langProps(project.title, locale)}>
            <Link href={href} className="after:absolute after:inset-0 md:after:hidden">
              {project.title.text}
            </Link>
          </h3>
          {project.summary.text ? (
            <p className="text-pretty text-muted" {...langProps(project.summary, locale)}>
              {project.summary.text}
            </p>
          ) : null}
        </div>
        <div className="grid gap-5">
          <TechList items={project.technologies} />
          <Link href={href} className="link w-fit text-sm font-medium">
            {dict.projects.readCaseStudy}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProjectCard({ project, locale }: { project: ProjectCardView; locale: Locale }) {
  const href = `/${locale}/projects/${project.slug}`;
  return (
    <article className="group relative grid content-start gap-4">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius)] border border-border bg-surface-2">
        {project.cover ? (
          <ResponsiveImage
            image={project.cover}
            alt=""
            sizes="(min-width: 1200px) 440px, (min-width: 768px) 45vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-[1.02]"
          />
        ) : (
          <Placeholder title={project.title.text} />
        )}
      </div>
      <div className="grid gap-2">
        <Meta project={project} locale={locale} />
        <h3 className="heading text-xl" {...langProps(project.title, locale)}>
          <Link
            href={href}
            className="decoration-accent-line underline-offset-4 group-hover:underline after:absolute after:inset-0"
          >
            {project.title.text}
          </Link>
        </h3>
        {project.summary.text ? (
          <p className="line-clamp-3 text-sm text-pretty text-muted" {...langProps(project.summary, locale)}>
            {project.summary.text}
          </p>
        ) : null}
        <TechList items={project.technologies.slice(0, 6)} className="mt-1" />
      </div>
    </article>
  );
}

/** Shown when a project has no screenshot yet: the title set large on a quiet surface. */
function Placeholder({ title }: { title: string }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-end bg-surface-2 p-5">
      <span className="display line-clamp-2 text-3xl text-border-strong">{title}</span>
    </div>
  );
}
