/**
 * Public, cached content reads.
 *
 * - Only published entries are returned, except while the admin has Draft Mode
 *   (preview) enabled, in which case drafts are included and marked.
 * - Results are cached with `use cache` and tagged; admin mutations expire the
 *   tags (see ./invalidate.ts), so changes appear without a redeploy.
 * - Return values are plain serializable view models, never raw rows, so
 *   nothing internal (ids of drafts, emails that aren't published...) leaks.
 */
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";

import type { Locale } from "@/lib/i18n/config";
import type {
  AccomplishmentView,
  EducationView,
  ExperienceView,
  LocalText,
  ProfileView,
  ProjectCardView,
  ProjectDetailView,
  SectionKey,
  SiteSettingsView,
  SkillGroupView,
  SocialLinkView,
  TagView,
} from "@/lib/types/content";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { documentView, imageView } from "@/server/media/view";

import { hasOwnTranslation, pickLabel, picker, type FallbackMode } from "./localize";
import { TAGS } from "./tags";

async function previewing(): Promise<boolean> {
  return (await draftMode()).isEnabled;
}

/* ------------------------------------------------------------------------ */

const DEFAULT_SECTIONS: { key: SectionKey; visible: boolean }[] = s.sectionKeys.map((key) => ({
  key,
  visible: true,
}));

export async function getSettings(locale: Locale): Promise<SiteSettingsView> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.settings);

  const row = await db.query.siteSettings.findFirst({
    with: { translations: true, ogImage: true },
  });
  const mode: FallbackMode = row?.fallbackMode ?? "english";
  const t = picker(row?.translations ?? [], locale, mode);

  // Keep the stored order, but make sure every known section is present exactly once.
  const stored = (row?.sections ?? DEFAULT_SECTIONS).filter((sec) => s.sectionKeys.includes(sec.key));
  const sections = [...stored, ...DEFAULT_SECTIONS.filter((d) => !stored.some((sec) => sec.key === d.key))];

  return {
    defaultTheme: row?.defaultTheme ?? "dark",
    accent: row?.accent ?? "brass",
    sections,
    showProjectsButton: row?.showProjectsButton ?? true,
    showCvButton: row?.showCvButton ?? true,
    showContactButton: row?.showContactButton ?? true,
    contactFormEnabled: row?.contactFormEnabled ?? true,
    arabicEnabled: row?.arabicEnabled ?? true,
    fallbackMode: mode,
    allowIndexing: row?.allowIndexing ?? false,
    siteTitle: t("siteTitle"),
    metaDescription: t("metaDescription"),
    contactHeading: t("contactHeading"),
    contactText: t("contactText"),
    footerNote: t("footerNote"),
    ogImage: imageView(row?.ogImage, locale),
    updatedAt: (row?.updatedAt ?? new Date(0)).toISOString(),
  };
}

export async function getProfile(locale: Locale): Promise<ProfileView> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.profile);

  const [row, settings] = await Promise.all([
    db.query.profile.findFirst({ with: { translations: true, photo: true } }),
    db.query.siteSettings.findFirst({ columns: { fallbackMode: true } }),
  ]);
  const mode: FallbackMode = settings?.fallbackMode ?? "english";
  const rows = row?.translations ?? [];
  const t = picker(rows, locale, mode);

  const availabilityLabel = t("availabilityLabel");
  const cvLang: Locale | null =
    locale === "ar" && row?.cvArId ? "ar" : row?.cvEnId ? "en" : row?.cvArId ? "ar" : null;

  return {
    fullName: t("fullName"),
    headline: t("headline"),
    intro: t("intro"),
    location: row?.showLocation ? t("location") : null,
    languages: t("languages"),
    availability:
      row?.showAvailability && (row.availability !== "custom" || availabilityLabel.text)
        ? { kind: row.availability, label: availabilityLabel }
        : null,
    bio: t("bio"),
    interests: t("interests"),
    careerGoals: t("careerGoals"),
    disciplines: t("disciplines"),
    personalStatement: t("personalStatement"),
    photo: imageView(row?.photo, locale),
    cv: { available: cvLang !== null, lang: cvLang },
    email: row?.showEmail && row.email ? row.email : null,
    phone: row?.showPhone && row.phone ? row.phone : null,
  };
}

export async function getSocialLinks(): Promise<SocialLinkView[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.social);

  const rows = await db
    .select()
    .from(s.socialLinks)
    .where(eq(s.socialLinks.isVisible, true))
    .orderBy(asc(s.socialLinks.sortOrder), asc(s.socialLinks.createdAt));
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    label: r.label,
    url: r.url,
    showInHero: r.showInHero,
    showInContact: r.showInContact,
    showInFooter: r.showInFooter,
  }));
}

/* -------------------------------- projects -------------------------------- */

type ProjectRow = Awaited<ReturnType<typeof loadProjects>>[number];

async function loadProjects(preview: boolean, slug?: string) {
  const filters: SQL[] = [];
  if (!preview) filters.push(eq(s.projects.status, "published"));
  if (slug) filters.push(eq(s.projects.slug, slug));
  return db.query.projects.findMany({
    where: filters.length ? and(...filters) : undefined,
    orderBy: [asc(s.projects.sortOrder), asc(s.projects.createdAt)],
    with: {
      translations: true,
      category: true,
      images: { with: { media: true }, orderBy: [asc(s.projectImages.sortOrder)] },
      skills: { with: { skill: true }, orderBy: [asc(s.projectSkills.sortOrder)] },
    },
  });
}

function toTags(links: { skill: typeof s.skills.$inferSelect }[], locale: Locale): TagView[] {
  return links.map(({ skill }) => ({
    id: skill.id,
    name: locale === "ar" && skill.nameAr ? skill.nameAr : skill.name,
    iconSlug: skill.iconSlug,
  }));
}

function projectCard(row: ProjectRow, locale: Locale, mode: FallbackMode): ProjectCardView {
  const t = picker(row.translations, locale, mode);
  const coverRow = row.images.find((i) => i.isCover) ?? row.images.find((i) => i.role === "gallery");
  return {
    id: row.id,
    slug: row.slug,
    title: t("title"),
    summary: t("summary"),
    stage: row.stage,
    category: row.category
      ? { slug: row.category.slug, name: pickLabel(row.category.nameEn, row.category.nameAr, locale).text }
      : null,
    isFeatured: row.isFeatured,
    startDate: row.startDate,
    endDate: row.endDate,
    cover: imageView(coverRow?.media, locale),
    technologies: toTags(row.skills, locale),
    repoUrl: row.repoUrl,
    liveUrl: row.liveUrl,
    isDraft: row.status !== "published",
  };
}

function shownInLocale(rows: { locale: "en" | "ar"; title: string }[], locale: Locale, mode: FallbackMode) {
  return locale === "en" || mode === "english" || hasOwnTranslation(rows, locale, "title");
}

async function fallbackMode(): Promise<FallbackMode> {
  const row = await db.query.siteSettings.findFirst({ columns: { fallbackMode: true } });
  return row?.fallbackMode ?? "english";
}

export async function getProjects(locale: Locale): Promise<ProjectCardView[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.projects);

  const preview = await previewing();
  const [rows, mode] = await Promise.all([loadProjects(preview), fallbackMode()]);
  return rows
    .filter((r) => shownInLocale(r.translations, locale, mode))
    .map((r) => projectCard(r, locale, mode));
}

export async function getProject(locale: Locale, slug: string): Promise<ProjectDetailView | null> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.projects);

  const preview = await previewing();
  const [[row], mode] = await Promise.all([loadProjects(preview, slug), fallbackMode()]);
  if (!row || !shownInLocale(row.translations, locale, mode)) return null;
  const t = picker(row.translations, locale, mode);
  const caption = (img: (typeof row.images)[number]): LocalText =>
    pickLabel(img.captionEn, img.captionAr, locale);
  const withImage = (img: (typeof row.images)[number]) => {
    const image = imageView(img.media, locale);
    return image ? [{ image, caption: caption(img) }] : [];
  };

  return {
    ...projectCard(row, locale, mode),
    overview: t("overview"),
    problem: t("problem"),
    solution: t("solution"),
    role: t("role"),
    features: t("features"),
    architecture: t("architecture"),
    challenges: t("challenges"),
    videoUrl: row.videoUrl,
    gallery: row.images.filter((i) => i.role === "gallery").flatMap(withImage),
    diagrams: row.images.filter((i) => i.role === "diagram").flatMap(withImage),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Published project slugs, for static generation and the sitemap. */
export async function getProjectSlugs(): Promise<{ slug: string; updatedAt: string; hasArabic: boolean }[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.projects);

  const rows = await db.query.projects.findMany({
    where: eq(s.projects.status, "published"),
    columns: { slug: true, updatedAt: true },
    with: { translations: { columns: { locale: true, title: true } } },
  });
  return rows.map((r) => ({
    slug: r.slug,
    updatedAt: r.updatedAt.toISOString(),
    hasArabic: hasOwnTranslation(r.translations, "ar", "title"),
  }));
}

/* --------------------------------- skills --------------------------------- */

export async function getSkills(locale: Locale): Promise<SkillGroupView[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.skills);

  const categories = await db.query.skillCategories.findMany({
    where: eq(s.skillCategories.isVisible, true),
    orderBy: [asc(s.skillCategories.sortOrder), asc(s.skillCategories.createdAt)],
    with: {
      skills: {
        where: eq(s.skills.isVisible, true),
        orderBy: [asc(s.skills.sortOrder), asc(s.skills.name)],
      },
    },
  });
  return categories
    .filter((c) => c.skills.length > 0)
    .map((c) => ({
      id: c.id,
      name: pickLabel(c.nameEn, c.nameAr, locale),
      skills: c.skills.map((sk) => ({
        id: sk.id,
        name: locale === "ar" && sk.nameAr ? sk.nameAr : sk.name,
        iconSlug: sk.iconSlug,
        proficiency: sk.proficiency,
      })),
    }));
}

/** Technologies used by published projects, for the project filter. */
export async function getProjectFilters(locale: Locale) {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.projects, TAGS.skills);

  const projects = await getProjects(locale);
  const categories = new Map<string, string>();
  const technologies = new Map<string, string>();
  for (const p of projects) {
    if (p.category) categories.set(p.category.slug, p.category.name);
    for (const tech of p.technologies) technologies.set(tech.name.toLowerCase(), tech.name);
  }
  return {
    categories: [...categories].map(([slug, name]) => ({ slug, name })),
    technologies: [...technologies.values()].sort((a, b) => a.localeCompare(b)),
  };
}

/* ------------------------------- experience ------------------------------- */

export async function getExperience(locale: Locale): Promise<ExperienceView[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.experience);

  const preview = await previewing();
  const [rows, mode] = await Promise.all([
    db.query.experiences.findMany({
      where: preview ? undefined : eq(s.experiences.status, "published"),
      orderBy: [asc(s.experiences.sortOrder), asc(s.experiences.createdAt)],
      with: {
        translations: true,
        logo: true,
        skills: { with: { skill: true }, orderBy: [asc(s.experienceSkills.sortOrder)] },
      },
    }),
    fallbackMode(),
  ]);
  return rows
    .filter((r) => locale === "en" || mode === "english" || hasOwnTranslation(r.translations, locale, "role"))
    .map((r) => {
      const t = picker(r.translations, locale, mode);
      return {
        id: r.id,
        type: r.type,
        state: r.state,
        isRemote: r.isRemote,
        startDate: r.startDate,
        endDate: r.endDate,
        organization: t("organization"),
        role: t("role"),
        location: t("location"),
        description: t("description"),
        responsibilities: t("responsibilities"),
        achievements: t("achievements"),
        url: r.url,
        logo: imageView(r.logo, locale),
        technologies: toTags(r.skills, locale),
        isDraft: r.status !== "published",
      };
    });
}

/* -------------------------------- education ------------------------------- */

export async function getEducation(locale: Locale): Promise<EducationView[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.education);

  const preview = await previewing();
  const [rows, mode] = await Promise.all([
    db.query.education.findMany({
      where: preview ? undefined : eq(s.education.status, "published"),
      orderBy: [asc(s.education.sortOrder), asc(s.education.createdAt)],
      with: { translations: true, logo: true },
    }),
    fallbackMode(),
  ]);
  return rows
    .filter(
      (r) =>
        locale === "en" || mode === "english" || hasOwnTranslation(r.translations, locale, "institution"),
    )
    .map((r) => {
      const t = picker(r.translations, locale, mode);
      return {
        id: r.id,
        educationStatus: r.educationStatus,
        startDate: r.startDate,
        endDate: r.endDate,
        grade: r.grade,
        institution: t("institution"),
        degree: t("degree"),
        field: t("field"),
        location: t("location"),
        description: t("description"),
        courses: t("courses"),
        honors: t("honors"),
        url: r.url,
        logo: imageView(r.logo, locale),
        isDraft: r.status !== "published",
      };
    });
}

/* ----------------------------- accomplishments ---------------------------- */

export async function getAccomplishments(locale: Locale): Promise<AccomplishmentView[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all, TAGS.accomplishments);

  const preview = await previewing();
  const [rows, mode] = await Promise.all([
    db.query.accomplishments.findMany({
      where: preview ? undefined : eq(s.accomplishments.status, "published"),
      orderBy: [asc(s.accomplishments.sortOrder), asc(s.accomplishments.createdAt)],
      with: { translations: true, document: true },
    }),
    fallbackMode(),
  ]);
  return rows
    .filter(
      (r) => locale === "en" || mode === "english" || hasOwnTranslation(r.translations, locale, "title"),
    )
    .map((r) => {
      const t = picker(r.translations, locale, mode);
      return {
        id: r.id,
        kind: r.kind,
        issuedOn: r.issuedOn,
        expiresOn: r.expiresOn,
        credentialId: r.credentialId,
        credentialUrl: r.credentialUrl,
        document: documentView(r.document),
        title: t("title"),
        issuer: t("issuer"),
        description: t("description"),
        isDraft: r.status !== "published",
      };
    });
}

/* ------------------------------------ CV ----------------------------------- */

/** Storage URL of the current CV for a language (falls back to English). Uncached: used by /cv. */
export async function getCurrentCvUrl(locale: Locale): Promise<string | null> {
  const row = await db.query.profile.findFirst({ with: { cvEn: true, cvAr: true } });
  const asset = (locale === "ar" ? row?.cvAr : null) ?? row?.cvEn ?? row?.cvAr;
  return documentView(asset)?.url ?? null;
}

/** Most recent edit across published content, shown as the "Updated" date in the hero. */
export async function getLastUpdated(): Promise<string> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all);

  const result = await db.execute<{ last: Date | null }>(sql`
    SELECT GREATEST(
      (SELECT max(updated_at) FROM profile_translations),
      (SELECT max(updated_at) FROM projects WHERE status = 'published'),
      (SELECT max(updated_at) FROM experiences WHERE status = 'published'),
      (SELECT max(updated_at) FROM education WHERE status = 'published'),
      (SELECT max(updated_at) FROM accomplishments WHERE status = 'published'),
      (SELECT max(updated_at) FROM skills),
      (SELECT max(updated_at) FROM profile)
    ) AS last
  `);
  const last = result.rows[0]?.last;
  return (last ? new Date(last) : new Date()).toISOString();
}

/** Today's date (UTC, YYYY-MM-DD), refreshed daily without making pages dynamic. */
export async function getToday(): Promise<string> {
  "use cache";
  cacheLife("hours");
  return new Date().toISOString().slice(0, 10);
}
