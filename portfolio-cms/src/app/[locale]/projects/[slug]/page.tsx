import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import type { ReactNode } from "react";

import { TechIcon } from "@/components/public/icons";
import { JsonLd, projectJsonLd } from "@/components/public/json-ld";
import { langProps, RichText } from "@/components/public/local-text";
import { ProjectGallery } from "@/components/public/project-gallery";
import { ResponsiveImage } from "@/components/shared/responsive-image";
import { formatRange } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n";
import { isLocale, ogLocale } from "@/lib/i18n/config";
import type { LocalText } from "@/lib/types/content";
import { videoEmbedUrl } from "@/lib/video";
import { getProfile, getProject, getProjectSlugs, getSettings } from "@/server/content/public";
import { siteUrl } from "@/server/env";

export const instant = true;

/** Published projects are prerendered; new ones render on first visit and are then cached. */
export async function generateStaticParams() {
  const raw = await localeParam();
  const slugs = await getProjectSlugs();
  const list = raw === "ar" ? slugs.filter((s) => s.hasArabic) : slugs;
  // Cache Components needs at least one value; "_" simply renders the 404 page.
  return list.length ? list.map((s) => ({ slug: s.slug })) : [{ slug: "_" }];
}

async function load(params: Promise<{ locale: string; slug: string }>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const project = await getProject(locale, slug);
  if (!project) notFound();
  return { locale, project };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects/[slug]">): Promise<Metadata> {
  const { locale, project } = await load(params);
  const settings = await getSettings(locale);
  const path = `/${locale}/projects/${project.slug}`;
  return {
    title: project.title.text,
    description: project.summary.text || undefined,
    alternates: {
      canonical: path,
      languages: settings.arabicEnabled
        ? { en: `/en/projects/${project.slug}`, ar: `/ar/projects/${project.slug}` }
        : undefined,
    },
    robots: project.isDraft ? { index: false } : undefined,
    openGraph: {
      type: "article",
      locale: ogLocale[locale],
      url: path,
      title: project.title.text,
      description: project.summary.text || undefined,
      images: project.cover
        ? [
            {
              url: project.cover.src,
              width: project.cover.width,
              height: project.cover.height,
              alt: project.title.text,
            },
          ]
        : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageProps<"/[locale]/projects/[slug]">) {
  const { locale, project } = await load(params);
  const dict = getDictionary(locale);
  const profile = await getProfile(locale);
  const note = dict.content.englishOnly;
  const video = project.videoUrl ? videoEmbedUrl(project.videoUrl) : null;
  const timeline = formatRange(
    project.startDate,
    project.endDate,
    locale,
    project.stage === "in_progress" ? dict.experience.present : "",
  );

  const chapters: { id: string; title: string; value: LocalText }[] = [
    { id: "overview", title: dict.projects.overview, value: project.overview },
    { id: "problem", title: dict.projects.problem, value: project.problem },
    { id: "solution", title: dict.projects.solution, value: project.solution },
    { id: "role", title: dict.projects.role, value: project.role },
    { id: "features", title: dict.projects.features, value: project.features },
  ];

  return (
    <article className="mx-auto max-w-[1200px] px-5 pt-10 pb-20 md:px-8 md:pt-14">
      <JsonLd data={projectJsonLd(project, locale, siteUrl(), profile.fullName.text)} />
      <Link href={`/${locale}/projects`} className="link text-sm text-muted">
        {dict.projects.backToProjects}
      </Link>

      <header className="mt-8 grid gap-5">
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-subtle">
          {project.isDraft ? (
            <span className="rounded-full border border-accent-line px-2 text-fg">{dict.preview.draft}</span>
          ) : null}
          {project.category ? <span>{project.category.name}</span> : null}
          <span>{dict.projects.stage[project.stage]}</span>
        </p>
        <h1
          className="display max-w-[18ch] text-[clamp(2.5rem,7vw,5rem)] text-balance"
          {...langProps(project.title, locale)}
        >
          {project.title.text}
        </h1>
        {project.summary.text ? (
          <p className="measure text-xl text-pretty text-muted" {...langProps(project.summary, locale)}>
            {project.summary.text}
          </p>
        ) : null}
      </header>

      {project.cover ? (
        <div className="mt-12 overflow-hidden rounded-[var(--radius-lg)] border border-border">
          <ResponsiveImage
            image={project.cover}
            sizes="(min-width: 1200px) 1136px, 100vw"
            priority
            className="h-auto w-full"
          />
        </div>
      ) : null}

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
        <div className="grid content-start gap-12">
          {chapters
            .filter((c) => c.value.text.trim())
            .map((chapter) => (
              <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`} className="grid gap-4">
                <h2 id={`chapter-${chapter.id}`} className="heading text-xl">
                  {chapter.title}
                </h2>
                <RichText value={chapter.value} locale={locale} fallbackNote={note} />
              </section>
            ))}

          {project.architecture.text.trim() || project.diagrams.length > 0 ? (
            <section aria-labelledby="chapter-architecture" className="grid gap-5">
              <h2 id="chapter-architecture" className="heading text-xl">
                {dict.projects.architecture}
              </h2>
              <RichText value={project.architecture} locale={locale} fallbackNote={note} />
              {project.diagrams.map((d, i) => (
                <figure key={d.image.id} className="grid gap-2">
                  <a
                    href={d.image.src}
                    target="_blank"
                    rel="noopener"
                    aria-label={`${dict.projects.openImage}: ${d.caption.text || d.image.alt || `${dict.projects.architecture} ${i + 1}`}`}
                    className="block overflow-hidden rounded-[var(--radius)] border border-border bg-surface"
                  >
                    <ResponsiveImage
                      image={d.image}
                      sizes="(min-width: 1200px) 760px, 100vw"
                      className="h-auto w-full"
                    />
                  </a>
                  {d.caption.text ? (
                    <figcaption className="text-sm text-subtle" lang={d.caption.lang} dir="auto">
                      {d.caption.text}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </section>
          ) : null}

          {project.challenges.text.trim() ? (
            <section aria-labelledby="chapter-challenges" className="grid gap-4">
              <h2 id="chapter-challenges" className="heading text-xl">
                {dict.projects.challenges}
              </h2>
              <RichText value={project.challenges} locale={locale} fallbackNote={note} />
            </section>
          ) : null}

          {video ? (
            <section aria-labelledby="chapter-video" className="grid gap-4">
              <h2 id="chapter-video" className="heading text-xl">
                {dict.projects.video}
              </h2>
              <div className="aspect-video overflow-hidden rounded-[var(--radius)] border border-border bg-surface-2">
                <iframe
                  src={video}
                  title={`${dict.projects.video}: ${project.title.text}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="h-full w-full"
                />
              </div>
            </section>
          ) : null}

          {project.gallery.length > (project.cover ? 1 : 0) ? (
            <section aria-labelledby="chapter-gallery" className="grid gap-5">
              <h2 id="chapter-gallery" className="heading text-xl">
                {dict.projects.gallery}
              </h2>
              <ProjectGallery
                shots={project.gallery}
                pageLocale={locale}
                labels={{
                  open: dict.projects.openImage,
                  close: dict.projects.closeImage,
                  previous: dict.projects.previousImage,
                  next: dict.projects.nextImage,
                  counter: dict.projects.imageCounter,
                }}
              />
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
          <dl className="grid overflow-hidden rounded-[var(--radius)] border border-border-strong text-sm">
            {timeline ? (
              <Row label={dict.projects.timeline}>
                <span className="tabular">{timeline}</span>
              </Row>
            ) : null}
            <Row label={dict.projects.status}>{dict.projects.stage[project.stage]}</Row>
            {project.technologies.length > 0 ? (
              <Row label={dict.projects.technologies}>
                <ul className="grid gap-1.5">
                  {project.technologies.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <span className="flex size-4 items-center justify-center text-muted">
                        <TechIcon slug={t.iconSlug} className="size-3.5" />
                      </span>
                      <span dir="auto">{t.name}</span>
                    </li>
                  ))}
                </ul>
              </Row>
            ) : null}
            {project.repoUrl || project.liveUrl ? (
              <Row label={dict.projects.links}>
                <ul className="grid gap-1.5">
                  {project.liveUrl ? (
                    <li>
                      <ExternalLink href={project.liveUrl}>{dict.projects.liveDemo}</ExternalLink>
                    </li>
                  ) : null}
                  {project.repoUrl ? (
                    <li>
                      <ExternalLink href={project.repoUrl}>{dict.projects.sourceCode}</ExternalLink>
                    </li>
                  ) : null}
                </ul>
              </Row>
            ) : null}
          </dl>
        </aside>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b border-border px-4 py-3 last:border-b-0">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link inline-flex items-center gap-1 font-medium"
    >
      {children}
      <ArrowUpRight className="size-3.5 text-subtle" aria-hidden="true" />
    </a>
  );
}
