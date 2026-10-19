import type { Locale } from "@/lib/i18n/config";
import type { ProjectDetailView } from "@/lib/types/content";
import type { SiteData } from "@/server/content/site";

/** Serialises structured data safely (no "</script>" breakouts). */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** schema.org ProfilePage + Person, using only what the owner has published. */
export function personJsonLd(data: SiteData, locale: Locale, base: string): Record<string, unknown> | null {
  const name = data.profile.fullName.text;
  if (!name) return null;
  const education = data.education[0];
  const current = data.experience.find((e) => e.state === "current");
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${base}/${locale}`,
    inLanguage: locale,
    mainEntity: {
      "@type": "Person",
      name,
      jobTitle: data.profile.headline.text || undefined,
      description: data.profile.intro.text || undefined,
      image: data.profile.photo ? new URL(data.profile.photo.src, base).toString() : undefined,
      email: data.profile.email ? `mailto:${data.profile.email}` : undefined,
      address: data.profile.location?.text
        ? { "@type": "PostalAddress", addressLocality: data.profile.location.text }
        : undefined,
      sameAs: data.social.map((l) => l.url),
      alumniOf: education
        ? {
            "@type": "CollegeOrUniversity",
            name: education.institution.text,
            url: education.url || undefined,
          }
        : undefined,
      worksFor: current ? { "@type": "Organization", name: current.organization.text } : undefined,
      knowsAbout: data.skills.flatMap((g) => g.skills.map((s) => s.name)).slice(0, 30),
    },
  };
}

export function projectJsonLd(project: ProjectDetailView, locale: Locale, base: string, author: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title.text,
    description: project.summary.text || undefined,
    url: `${base}/${locale}/projects/${project.slug}`,
    inLanguage: project.title.lang,
    dateCreated: project.startDate ?? undefined,
    dateModified: project.updatedAt,
    image: project.cover ? new URL(project.cover.src, base).toString() : undefined,
    author: author ? { "@type": "Person", name: author } : undefined,
    keywords: project.technologies.map((t) => t.name).join(", ") || undefined,
    codeRepository: project.repoUrl || undefined,
  };
}
