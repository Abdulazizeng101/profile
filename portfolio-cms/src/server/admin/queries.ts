import "server-only";

/*
 * Data access for the dashboard. Every function verifies the admin session
 * itself (cached per request), so data can never be read through a page or
 * action that forgot to check, even during client-side navigation where
 * layouts are not re-rendered.
 */

import { asc, count, desc, eq, sql } from "drizzle-orm";

import type {
  AccomplishmentInput,
  EducationInput,
  ExperienceInput,
  ProfileInput,
  ProjectInput,
} from "@/lib/validation/content";
import { requireAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { techIconPath } from "@/components/public/icons";
import { mediaUsage } from "@/server/media/service";
import { documentView, imageView } from "@/server/media/view";

type Locale = "en" | "ar";

/** Turns translation rows into { en: {...}, ar: {...} } with every field present. */
function byLocale<R extends { locale: Locale }, K extends keyof R & string>(rows: R[], fields: readonly K[]) {
  const pick = (locale: Locale) => {
    const row = rows.find((r) => r.locale === locale);
    return Object.fromEntries(fields.map((f) => [f, (row?.[f] as string | undefined) ?? ""])) as Record<
      K,
      string
    >;
  };
  return { en: pick("en"), ar: pick("ar") };
}

const PROFILE_TEXT = ["fullName", "headline", "intro", "location", "availabilityLabel", "languages"] as const;
const ABOUT_TEXT = ["bio", "interests", "careerGoals", "disciplines", "personalStatement"] as const;
const PROJECT_TEXT = [
  "title",
  "summary",
  "overview",
  "problem",
  "solution",
  "role",
  "features",
  "architecture",
  "challenges",
] as const;
const EDUCATION_TEXT = [
  "institution",
  "degree",
  "field",
  "location",
  "description",
  "courses",
  "honors",
] as const;
const EXPERIENCE_TEXT = [
  "organization",
  "role",
  "location",
  "description",
  "responsibilities",
  "achievements",
] as const;
const ACCOMPLISHMENT_TEXT = ["title", "issuer", "description"] as const;

/* -------------------------------- profile --------------------------------- */

export async function getProfileEditor() {
  await requireAdmin();
  const row = await db.query.profile.findFirst({
    with: { translations: true, photo: true, cvEn: true, cvAr: true },
  });
  const input: ProfileInput = {
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    showEmail: row?.showEmail ?? false,
    showPhone: row?.showPhone ?? false,
    showLocation: row?.showLocation ?? false,
    availability: row?.availability ?? "open",
    showAvailability: row?.showAvailability ?? true,
    translations: byLocale(row?.translations ?? [], PROFILE_TEXT),
  };
  return {
    input,
    about: { translations: byLocale(row?.translations ?? [], ABOUT_TEXT) },
    photo: row?.photo
      ? { ...imageView(row.photo, "en")!, altEn: row.photo.altEn, altAr: row.photo.altAr }
      : null,
    cvEn: documentView(row?.cvEn),
    cvAr: documentView(row?.cvAr),
  };
}

/* -------------------------------- projects -------------------------------- */

export async function getProjectsList() {
  await requireAdmin();
  const rows = await db.query.projects.findMany({
    orderBy: [asc(s.projects.sortOrder), asc(s.projects.createdAt)],
    with: {
      translations: { columns: { locale: true, title: true, summary: true } },
      category: true,
      images: { with: { media: true }, where: eq(s.projectImages.isCover, true) },
    },
  });
  return rows.map((r) => {
    const en = r.translations.find((t) => t.locale === "en");
    const ar = r.translations.find((t) => t.locale === "ar");
    return {
      id: r.id,
      slug: r.slug,
      title: en?.title || "(untitled)",
      status: r.status,
      stage: r.stage,
      isFeatured: r.isFeatured,
      isSample: r.isSample,
      category: r.category?.nameEn ?? null,
      hasArabic: Boolean(ar?.title),
      cover: imageView(r.images[0]?.media, "en"),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

export async function loadProjectInput(id: string): Promise<ProjectInput | null> {
  await requireAdmin();
  const row = await db.query.projects.findFirst({
    where: eq(s.projects.id, id),
    with: { translations: true, skills: { orderBy: [asc(s.projectSkills.sortOrder)] } },
  });
  if (!row) return null;
  return {
    slug: row.slug,
    status: row.status,
    stage: row.stage,
    categoryId: row.categoryId,
    isFeatured: row.isFeatured,
    isSample: row.isSample,
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? "",
    repoUrl: row.repoUrl,
    liveUrl: row.liveUrl,
    videoUrl: row.videoUrl,
    skillIds: row.skills.map((l) => l.skillId),
    translations: byLocale(row.translations, PROJECT_TEXT),
  };
}

export async function getProjectImages(projectId: string) {
  await requireAdmin();
  const rows = await db.query.projectImages.findMany({
    where: eq(s.projectImages.projectId, projectId),
    orderBy: [asc(s.projectImages.sortOrder)],
    with: { media: true },
  });
  return rows.flatMap((r) => {
    const image = imageView(r.media, "en");
    return image
      ? [
          {
            id: r.id,
            mediaId: r.mediaId,
            role: r.role,
            captionEn: r.captionEn,
            captionAr: r.captionAr,
            isCover: r.isCover,
            image,
          },
        ]
      : [];
  });
}

export async function getProjectCategories() {
  await requireAdmin();
  return db
    .select()
    .from(s.projectCategories)
    .orderBy(asc(s.projectCategories.sortOrder), asc(s.projectCategories.nameEn));
}

/** Every skill, for technology pickers (hidden skills included). */
export async function getSkillOptions() {
  await requireAdmin();
  const rows = await db.query.skills.findMany({
    orderBy: [asc(s.skills.name)],
    with: { category: { columns: { nameEn: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, category: r.category?.nameEn ?? "" }));
}

/* --------------------------------- skills --------------------------------- */

export async function getSkillsEditor() {
  await requireAdmin();
  const [categories, uncategorized] = await Promise.all([
    db.query.skillCategories.findMany({
      orderBy: [asc(s.skillCategories.sortOrder), asc(s.skillCategories.createdAt)],
      with: { skills: { orderBy: [asc(s.skills.sortOrder), asc(s.skills.name)] } },
    }),
    db.query.skills.findMany({
      where: sql`${s.skills.categoryId} is null`,
      orderBy: [asc(s.skills.sortOrder), asc(s.skills.name)],
    }),
  ]);
  const usage = await db
    .select({ skillId: s.projectSkills.skillId, n: count() })
    .from(s.projectSkills)
    .groupBy(s.projectSkills.skillId);
  const used = new Map(usage.map((u) => [u.skillId, Number(u.n)]));
  const mapSkill = (sk: typeof s.skills.$inferSelect) => ({
    id: sk.id,
    name: sk.name,
    nameAr: sk.nameAr,
    categoryId: sk.categoryId,
    iconSlug: sk.iconSlug,
    iconPath: techIconPath(sk.iconSlug),
    proficiency: sk.proficiency,
    isVisible: sk.isVisible,
    projectCount: used.get(sk.id) ?? 0,
  });
  return {
    categories: categories.map((c) => ({
      id: c.id,
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      isVisible: c.isVisible,
      skills: c.skills.map(mapSkill),
    })),
    uncategorized: uncategorized.map(mapSkill),
  };
}

/* -------------------------------- education ------------------------------- */

export async function getEducationList() {
  await requireAdmin();
  const rows = await db.query.education.findMany({
    orderBy: [asc(s.education.sortOrder), asc(s.education.createdAt)],
    with: { translations: { columns: { locale: true, institution: true, degree: true, field: true } } },
  });
  return rows.map((r) => {
    const en = r.translations.find((t) => t.locale === "en");
    return {
      id: r.id,
      title: [en?.degree, en?.field].filter(Boolean).join(", ") || "(untitled)",
      subtitle: en?.institution ?? "",
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate,
      hasArabic: Boolean(r.translations.find((t) => t.locale === "ar")?.institution),
    };
  });
}

export async function getEducationEditor(id: string) {
  await requireAdmin();
  const row = await db.query.education.findFirst({
    where: eq(s.education.id, id),
    with: { translations: true, logo: true },
  });
  if (!row) return null;
  const input: EducationInput = {
    status: row.status,
    educationStatus: row.educationStatus,
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? "",
    grade: row.grade,
    logoId: row.logoId,
    url: row.url,
    translations: byLocale(row.translations, EDUCATION_TEXT),
  };
  return { input, logo: imageView(row.logo, "en") };
}

/* -------------------------------- experience ------------------------------ */

export async function getExperienceList() {
  await requireAdmin();
  const rows = await db.query.experiences.findMany({
    orderBy: [asc(s.experiences.sortOrder), asc(s.experiences.createdAt)],
    with: { translations: { columns: { locale: true, organization: true, role: true } } },
  });
  return rows.map((r) => {
    const en = r.translations.find((t) => t.locale === "en");
    return {
      id: r.id,
      title: en?.role || "(untitled)",
      subtitle: en?.organization ?? "",
      status: r.status,
      state: r.state,
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
      hasArabic: Boolean(r.translations.find((t) => t.locale === "ar")?.role),
    };
  });
}

export async function getExperienceEditor(id: string) {
  await requireAdmin();
  const row = await db.query.experiences.findFirst({
    where: eq(s.experiences.id, id),
    with: { translations: true, logo: true, skills: { orderBy: [asc(s.experienceSkills.sortOrder)] } },
  });
  if (!row) return null;
  const input: ExperienceInput = {
    status: row.status,
    type: row.type,
    state: row.state,
    isRemote: row.isRemote,
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? "",
    logoId: row.logoId,
    url: row.url,
    skillIds: row.skills.map((l) => l.skillId),
    translations: byLocale(row.translations, EXPERIENCE_TEXT),
  };
  return { input, logo: imageView(row.logo, "en") };
}

/* ----------------------------- accomplishments ---------------------------- */

export async function getAccomplishmentList() {
  await requireAdmin();
  const rows = await db.query.accomplishments.findMany({
    orderBy: [asc(s.accomplishments.sortOrder), asc(s.accomplishments.createdAt)],
    with: { translations: { columns: { locale: true, title: true, issuer: true } } },
  });
  return rows.map((r) => {
    const en = r.translations.find((t) => t.locale === "en");
    return {
      id: r.id,
      title: en?.title || "(untitled)",
      subtitle: en?.issuer ?? "",
      kind: r.kind,
      status: r.status,
      issuedOn: r.issuedOn,
      hasArabic: Boolean(r.translations.find((t) => t.locale === "ar")?.title),
    };
  });
}

export async function getAccomplishmentEditor(id: string) {
  await requireAdmin();
  const row = await db.query.accomplishments.findFirst({
    where: eq(s.accomplishments.id, id),
    with: { translations: true, document: true },
  });
  if (!row) return null;
  const input: AccomplishmentInput = {
    status: row.status,
    kind: row.kind,
    issuedOn: row.issuedOn ?? "",
    expiresOn: row.expiresOn ?? "",
    credentialId: row.credentialId,
    credentialUrl: row.credentialUrl,
    documentId: row.documentId,
    translations: byLocale(row.translations, ACCOMPLISHMENT_TEXT),
  };
  return { input, document: documentView(row.document) };
}

/* ---------------------------- links & settings ---------------------------- */

export async function getSocialLinksAdmin() {
  await requireAdmin();
  return db.select().from(s.socialLinks).orderBy(asc(s.socialLinks.sortOrder), asc(s.socialLinks.createdAt));
}

export async function getSettingsEditor() {
  await requireAdmin();
  const row = await db.query.siteSettings.findFirst({ with: { translations: true, ogImage: true } });
  const text = byLocale(row?.translations ?? [], [
    "siteTitle",
    "metaDescription",
    "contactHeading",
    "contactText",
    "footerNote",
  ] as const);
  const sections = s.sectionKeys.map((key) => ({ key, visible: true }));
  const stored = row?.sections ?? sections;
  const merged = [...stored, ...sections.filter((d) => !stored.some((x) => x.key === d.key))];
  return {
    appearance: {
      defaultTheme: row?.defaultTheme ?? "dark",
      accent: row?.accent ?? "brass",
      sections: merged,
      showProjectsButton: row?.showProjectsButton ?? true,
      showCvButton: row?.showCvButton ?? true,
      showContactButton: row?.showContactButton ?? true,
    },
    contact: {
      contactFormEnabled: row?.contactFormEnabled ?? true,
      translations: {
        en: {
          contactHeading: text.en.contactHeading,
          contactText: text.en.contactText,
          footerNote: text.en.footerNote,
        },
        ar: {
          contactHeading: text.ar.contactHeading,
          contactText: text.ar.contactText,
          footerNote: text.ar.footerNote,
        },
      },
    },
    seo: {
      allowIndexing: row?.allowIndexing ?? false,
      ogImageId: row?.ogImageId ?? null,
      translations: {
        en: { siteTitle: text.en.siteTitle, metaDescription: text.en.metaDescription },
        ar: { siteTitle: text.ar.siteTitle, metaDescription: text.ar.metaDescription },
      },
    },
    localization: {
      arabicEnabled: row?.arabicEnabled ?? true,
      fallbackMode: row?.fallbackMode ?? "english",
    },
    ogImage: imageView(row?.ogImage, "en"),
  };
}

/* ---------------------------------- media --------------------------------- */

export async function getMediaLibrary() {
  await requireAdmin();
  const rows = await db.select().from(s.mediaAssets).orderBy(desc(s.mediaAssets.createdAt));
  const usage = await mediaUsage();
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    originalName: r.originalName,
    bytes: r.bytes,
    width: r.width,
    height: r.height,
    altEn: r.altEn,
    altAr: r.altAr,
    createdAt: r.createdAt.toISOString(),
    usage: usage.get(r.id) ?? 0,
    image: imageView(r, "en"),
    document: documentView(r),
  }));
}

/* -------------------------------- messages -------------------------------- */

export async function getMessages(status: "new" | "read" | "archived" | "inbox" = "inbox") {
  await requireAdmin();
  const where =
    status === "inbox"
      ? sql`${s.contactMessages.status} <> 'archived'`
      : eq(s.contactMessages.status, status);
  return db
    .select()
    .from(s.contactMessages)
    .where(where)
    .orderBy(desc(s.contactMessages.createdAt))
    .limit(200);
}

export async function getMessage(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(s.contactMessages).where(eq(s.contactMessages.id, id));
  return row ?? null;
}

/* -------------------------------- overview -------------------------------- */

export async function getOverview() {
  await requireAdmin();
  const [
    profileData,
    settings,
    projectRows,
    experienceRows,
    educationRows,
    accomplishmentRows,
    skillCount,
    linkCount,
    unread,
    recent,
  ] = await Promise.all([
    getProfileEditor(),
    getSettingsEditor(),
    getProjectsList(),
    getExperienceList(),
    getEducationList(),
    getAccomplishmentList(),
    db.select({ n: count() }).from(s.skills),
    db.select({ n: count() }).from(s.socialLinks),
    db.select({ n: count() }).from(s.contactMessages).where(eq(s.contactMessages.status, "new")),
    db.select().from(s.contactMessages).orderBy(desc(s.contactMessages.createdAt)).limit(5),
  ]);

  const published = <T extends { status: string }>(rows: T[]) =>
    rows.filter((r) => r.status === "published").length;
  const en = profileData.input.translations.en;

  const checklist = [
    { done: Boolean(en.fullName), label: "Add your name and title", href: "/admin/profile" },
    { done: Boolean(profileData.photo), label: "Upload your profile photo", href: "/admin/media" },
    {
      done: Boolean(profileData.about.translations.en.bio),
      label: "Write your About section",
      href: "/admin/about",
    },
    { done: published(projectRows) > 0, label: "Publish your first project", href: "/admin/projects" },
    {
      done: !projectRows.some((p) => p.isSample),
      label: "Replace or delete the sample project",
      href: "/admin/projects",
    },
    { done: skillCount[0]!.n > 0, label: "Add your skills", href: "/admin/skills" },
    {
      done: published(educationRows) > 0,
      label: "Confirm and publish your education",
      href: "/admin/education",
    },
    { done: Boolean(profileData.cvEn), label: "Upload your CV", href: "/admin/files" },
    { done: linkCount[0]!.n > 0, label: "Add GitHub, LinkedIn and other links", href: "/admin/contact" },
    {
      done: Boolean(profileData.input.email && profileData.input.showEmail),
      label: "Publish a contact email",
      href: "/admin/profile",
    },
    { done: settings.seo.allowIndexing, label: "Let search engines index the site", href: "/admin/seo" },
  ];

  return {
    checklist,
    counts: {
      projects: { total: projectRows.length, published: published(projectRows) },
      experience: { total: experienceRows.length, published: published(experienceRows) },
      education: { total: educationRows.length, published: published(educationRows) },
      accomplishments: { total: accomplishmentRows.length, published: published(accomplishmentRows) },
      skills: skillCount[0]!.n,
      unread: unread[0]!.n,
    },
    missingArabic: [
      ...projectRows
        .filter((r) => r.status === "published" && !r.hasArabic)
        .map((r) => ({ label: r.title, href: `/admin/projects/${r.id}` })),
      ...experienceRows
        .filter((r) => r.status === "published" && !r.hasArabic)
        .map((r) => ({ label: r.title, href: `/admin/experience/${r.id}` })),
      ...educationRows
        .filter((r) => r.status === "published" && !r.hasArabic)
        .map((r) => ({ label: r.title, href: `/admin/education/${r.id}` })),
      ...accomplishmentRows
        .filter((r) => r.status === "published" && !r.hasArabic)
        .map((r) => ({ label: r.title, href: `/admin/accomplishments/${r.id}` })),
      ...(en.fullName && !profileData.input.translations.ar.fullName
        ? [{ label: "Profile", href: "/admin/profile" }]
        : []),
    ],
    recent,
    arabicEnabled: settings.localization.arabicEnabled,
  };
}

/** Opening a message marks it as read. Only called from authenticated admin pages. */
export async function markMessageRead(id: string) {
  await requireAdmin();
  await db
    .update(s.contactMessages)
    .set({ status: "read", readAt: new Date() })
    .where(sql`${s.contactMessages.id} = ${id} and ${s.contactMessages.status} = 'new'`);
}
