import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AboutSection } from "@/components/public/about-section";
import { AccomplishmentsSection } from "@/components/public/accomplishments-section";
import { ContactSection } from "@/components/public/contact-section";
import { EducationSection } from "@/components/public/education-section";
import { ExperienceSection } from "@/components/public/experience-section";
import { Hero } from "@/components/public/hero";
import { JsonLd, personJsonLd } from "@/components/public/json-ld";
import { ProjectsSection } from "@/components/public/projects-section";
import { SkillsSection } from "@/components/public/skills-section";
import { isLocale, type Locale } from "@/lib/i18n/config";
import type { SectionKey } from "@/lib/types/content";
import { getLastUpdated, getToday } from "@/server/content/public";
import { getSiteData } from "@/server/content/site";
import { siteUrl } from "@/server/env";

export const instant = true;

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: { canonical: `/${locale}` } };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const [data, updatedAt, today] = await Promise.all([getSiteData(locale), getLastUpdated(), getToday()]);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;

  const render: Record<SectionKey, () => ReactNode> = {
    about: () => <AboutSection locale={locale} profile={data.profile} />,
    projects: () => <ProjectsSection locale={locale} projects={data.projects} />,
    skills: () => <SkillsSection locale={locale} groups={data.skills} />,
    experience: () => <ExperienceSection locale={locale} items={data.experience} />,
    education: () => <EducationSection locale={locale} items={data.education} />,
    accomplishments: () => (
      <AccomplishmentsSection locale={locale} items={data.accomplishments} today={today} />
    ),
    contact: () => <ContactSection locale={locale} data={data} turnstileSiteKey={turnstileSiteKey} />,
  };

  return (
    <>
      <JsonLd data={personJsonLd(data, locale, siteUrl())} />
      <Hero locale={locale} data={data} updatedAt={updatedAt} />
      {data.sections.map((key) => (
        <div key={key}>{render[key]()}</div>
      ))}
    </>
  );
}
