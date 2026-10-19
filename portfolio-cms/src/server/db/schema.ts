/**
 * Database schema (Drizzle ORM, PostgreSQL).
 *
 * Conventions
 * - Every table has a stable UUID primary key (singletons use a fixed integer id = 1).
 * - Timestamps are `timestamptz`. Calendar dates (start/end dates) are `date`
 *   strings ("YYYY-MM-DD") so they never shift across time zones.
 * - Repeatable content has `sortOrder` and `status` (draft | published).
 * - Localisation:
 *     long-form content  -> a `*_translations` table keyed by (parentId, locale)
 *     short labels       -> paired `xxxEn` / `xxxAr` columns
 *   Language-neutral data (dates, URLs, ordering, flags) lives on the parent row.
 * - Files are never stored in the database: `media_assets` holds metadata and the
 *   storage key; the bytes live in the configured storage driver.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const localeEnum = pgEnum("locale", ["en", "ar"]);
export const publishStatusEnum = pgEnum("publish_status", ["draft", "published"]);
export const availabilityEnum = pgEnum("availability", ["open", "selective", "not_looking", "custom"]);
export const projectStageEnum = pgEnum("project_stage", [
  "completed",
  "in_progress",
  "maintained",
  "prototype",
  "archived",
]);
export const projectImageRoleEnum = pgEnum("project_image_role", ["gallery", "diagram"]);
export const proficiencyEnum = pgEnum("proficiency", ["learning", "familiar", "proficient", "advanced"]);
export const educationStatusEnum = pgEnum("education_status", ["graduated", "in_progress"]);
export const experienceTypeEnum = pgEnum("experience_type", [
  "full_time",
  "part_time",
  "internship",
  "coop",
  "contract",
  "freelance",
  "research",
  "teaching",
  "volunteer",
  "activity",
]);
export const experienceStatusEnum = pgEnum("experience_status", ["planned", "current", "completed"]);
export const accomplishmentKindEnum = pgEnum("accomplishment_kind", [
  "certification",
  "course",
  "award",
  "competition",
  "publication",
  "volunteer",
]);
export const mediaKindEnum = pgEnum("media_kind", ["image", "document"]);
export const socialPlatformEnum = pgEnum("social_platform", [
  "github",
  "linkedin",
  "x",
  "gitlab",
  "stackoverflow",
  "medium",
  "devto",
  "leetcode",
  "kaggle",
  "youtube",
  "website",
  "other",
]);
export const messageStatusEnum = pgEnum("message_status", ["new", "read", "archived"]);
export const themeEnum = pgEnum("theme", ["dark", "light", "system"]);
export const accentEnum = pgEnum("accent", ["brass", "gulf", "sage", "cobalt"]);
export const fallbackModeEnum = pgEnum("fallback_mode", ["english", "hide"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    displayName: text().notNull().default(""),
    passwordHash: text().notNull(),
    passwordChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("admin_users_email_unique").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 hex digest of the session token. The raw token only exists in the cookie. */
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userAgent: text().notNull().default(""),
    ipHash: text().notNull().default(""),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/** Fixed-window counters used for login and contact-form rate limiting. */
export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  windowStartedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

export type MediaVariant = { width: number; height: number; key: string; bytes: number };

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: mediaKindEnum().notNull(),
    /** Key of the stored original (documents) or the largest rendition (images). */
    storageKey: text().notNull(),
    originalName: text().notNull().default(""),
    mimeType: text().notNull(),
    bytes: integer().notNull(),
    width: integer(),
    height: integer(),
    /** Responsive WebP renditions, smallest first. */
    variants: jsonb().$type<MediaVariant[]>().notNull().default([]),
    /** Tiny inline placeholder shown while the image loads. */
    blurDataUrl: text().notNull().default(""),
    checksum: text().notNull(),
    altEn: text().notNull().default(""),
    altAr: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [uniqueIndex("media_storage_key_unique").on(t.storageKey)],
);

/* -------------------------------------------------------------------------- */
/* Profile & site settings (singletons)                                       */
/* -------------------------------------------------------------------------- */

export const profile = pgTable(
  "profile",
  {
    id: integer().primaryKey().default(1),
    photoId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    cvEnId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    cvArId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    email: text().notNull().default(""),
    phone: text().notNull().default(""),
    showEmail: boolean().notNull().default(false),
    showPhone: boolean().notNull().default(false),
    showLocation: boolean().notNull().default(false),
    availability: availabilityEnum().notNull().default("open"),
    showAvailability: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [check("profile_singleton", sql`${t.id} = 1`)],
);

export const profileTranslations = pgTable(
  "profile_translations",
  {
    profileId: integer()
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    locale: localeEnum().notNull(),
    fullName: text().notNull().default(""),
    headline: text().notNull().default(""),
    intro: text().notNull().default(""),
    location: text().notNull().default(""),
    availabilityLabel: text().notNull().default(""),
    /** Spoken languages as the owner writes them, e.g. "Arabic (native), English (fluent)". */
    languages: text().notNull().default(""),
    bio: text().notNull().default(""),
    interests: text().notNull().default(""),
    careerGoals: text().notNull().default(""),
    disciplines: text().notNull().default(""),
    personalStatement: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.profileId, t.locale] })],
);

export const sectionKeys = [
  "about",
  "projects",
  "skills",
  "experience",
  "education",
  "accomplishments",
  "contact",
] as const;
export type SectionKey = (typeof sectionKeys)[number];
export type SectionSetting = { key: SectionKey; visible: boolean };

export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer().primaryKey().default(1),
    defaultTheme: themeEnum().notNull().default("dark"),
    accent: accentEnum().notNull().default("brass"),
    sections: jsonb()
      .$type<SectionSetting[]>()
      .notNull()
      .default(sectionKeys.map((key) => ({ key, visible: true }))),
    showProjectsButton: boolean().notNull().default(true),
    showCvButton: boolean().notNull().default(true),
    showContactButton: boolean().notNull().default(true),
    contactFormEnabled: boolean().notNull().default(true),
    arabicEnabled: boolean().notNull().default(true),
    fallbackMode: fallbackModeEnum().notNull().default("english"),
    allowIndexing: boolean().notNull().default(false),
    ogImageId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [check("site_settings_singleton", sql`${t.id} = 1`)],
);

export const siteSettingsTranslations = pgTable(
  "site_settings_translations",
  {
    settingsId: integer()
      .notNull()
      .references(() => siteSettings.id, { onDelete: "cascade" }),
    locale: localeEnum().notNull(),
    siteTitle: text().notNull().default(""),
    metaDescription: text().notNull().default(""),
    contactHeading: text().notNull().default(""),
    contactText: text().notNull().default(""),
    footerNote: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.settingsId, t.locale] })],
);

export const socialLinks = pgTable("social_links", {
  id: uuid().primaryKey().defaultRandom(),
  platform: socialPlatformEnum().notNull(),
  label: text().notNull().default(""),
  url: text().notNull(),
  showInHero: boolean().notNull().default(true),
  showInContact: boolean().notNull().default(true),
  showInFooter: boolean().notNull().default(true),
  isVisible: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  ...timestamps,
});

/* -------------------------------------------------------------------------- */
/* Skills                                                                     */
/* -------------------------------------------------------------------------- */

export const skillCategories = pgTable("skill_categories", {
  id: uuid().primaryKey().defaultRandom(),
  nameEn: text().notNull(),
  nameAr: text().notNull().default(""),
  isVisible: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  ...timestamps,
});

export const skills = pgTable(
  "skills",
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid().references(() => skillCategories.id, { onDelete: "set null" }),
    name: text().notNull(),
    nameAr: text().notNull().default(""),
    /** Slug of a Simple Icons glyph, e.g. "typescript". Optional. */
    iconSlug: text().notNull().default(""),
    proficiency: proficiencyEnum(),
    /** Show in the Skills section. Hidden skills can still be used as project/experience tags. */
    isVisible: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("skills_name_unique").on(sql`lower(${t.name})`),
    index("skills_category_idx").on(t.categoryId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

export const projectCategories = pgTable(
  "project_categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull(),
    nameEn: text().notNull(),
    nameAr: text().notNull().default(""),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("project_categories_slug_unique").on(t.slug)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull(),
    status: publishStatusEnum().notNull().default("draft"),
    stage: projectStageEnum().notNull().default("completed"),
    categoryId: uuid().references(() => projectCategories.id, { onDelete: "set null" }),
    isFeatured: boolean().notNull().default(false),
    /** Marks seeded example content that must be replaced before publishing. */
    isSample: boolean().notNull().default(false),
    startDate: date({ mode: "string" }),
    endDate: date({ mode: "string" }),
    repoUrl: text().notNull().default(""),
    liveUrl: text().notNull().default(""),
    videoUrl: text().notNull().default(""),
    sortOrder: integer().notNull().default(0),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("projects_slug_unique").on(t.slug),
    index("projects_status_idx").on(t.status, t.sortOrder),
  ],
);

export const projectTranslations = pgTable(
  "project_translations",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    locale: localeEnum().notNull(),
    title: text().notNull().default(""),
    summary: text().notNull().default(""),
    overview: text().notNull().default(""),
    problem: text().notNull().default(""),
    solution: text().notNull().default(""),
    role: text().notNull().default(""),
    features: text().notNull().default(""),
    architecture: text().notNull().default(""),
    challenges: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.projectId, t.locale] })],
);

export const projectImages = pgTable(
  "project_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaId: uuid()
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    role: projectImageRoleEnum().notNull().default("gallery"),
    captionEn: text().notNull().default(""),
    captionAr: text().notNull().default(""),
    isCover: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("project_images_project_idx").on(t.projectId, t.sortOrder),
    uniqueIndex("project_images_one_cover")
      .on(t.projectId)
      .where(sql`${t.isCover}`),
  ],
);

export const projectSkills = pgTable(
  "project_skills",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.skillId] }), index("project_skills_skill_idx").on(t.skillId)],
);

/* -------------------------------------------------------------------------- */
/* Education                                                                  */
/* -------------------------------------------------------------------------- */

export const education = pgTable("education", {
  id: uuid().primaryKey().defaultRandom(),
  status: publishStatusEnum().notNull().default("draft"),
  educationStatus: educationStatusEnum().notNull().default("graduated"),
  startDate: date({ mode: "string" }),
  endDate: date({ mode: "string" }),
  /** Optional, only shown when entered. Never pre-filled. */
  grade: text().notNull().default(""),
  logoId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
  url: text().notNull().default(""),
  sortOrder: integer().notNull().default(0),
  ...timestamps,
});

export const educationTranslations = pgTable(
  "education_translations",
  {
    educationId: uuid()
      .notNull()
      .references(() => education.id, { onDelete: "cascade" }),
    locale: localeEnum().notNull(),
    institution: text().notNull().default(""),
    degree: text().notNull().default(""),
    field: text().notNull().default(""),
    location: text().notNull().default(""),
    description: text().notNull().default(""),
    courses: text().notNull().default(""),
    honors: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.educationId, t.locale] })],
);

/* -------------------------------------------------------------------------- */
/* Experience                                                                 */
/* -------------------------------------------------------------------------- */

export const experiences = pgTable(
  "experiences",
  {
    id: uuid().primaryKey().defaultRandom(),
    status: publishStatusEnum().notNull().default("draft"),
    type: experienceTypeEnum().notNull().default("full_time"),
    /** Planned / current / completed. Validated against the dates on save. */
    state: experienceStatusEnum().notNull().default("completed"),
    isRemote: boolean().notNull().default(false),
    startDate: date({ mode: "string" }),
    endDate: date({ mode: "string" }),
    logoId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    url: text().notNull().default(""),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("experiences_status_idx").on(t.status, t.sortOrder)],
);

export const experienceTranslations = pgTable(
  "experience_translations",
  {
    experienceId: uuid()
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    locale: localeEnum().notNull(),
    organization: text().notNull().default(""),
    role: text().notNull().default(""),
    location: text().notNull().default(""),
    description: text().notNull().default(""),
    responsibilities: text().notNull().default(""),
    achievements: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.experienceId, t.locale] })],
);

export const experienceSkills = pgTable(
  "experience_skills",
  {
    experienceId: uuid()
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.experienceId, t.skillId] })],
);

/* -------------------------------------------------------------------------- */
/* Certifications, courses, awards, competitions, publications, volunteering  */
/* -------------------------------------------------------------------------- */

export const accomplishments = pgTable(
  "accomplishments",
  {
    id: uuid().primaryKey().defaultRandom(),
    status: publishStatusEnum().notNull().default("draft"),
    kind: accomplishmentKindEnum().notNull(),
    issuedOn: date({ mode: "string" }),
    expiresOn: date({ mode: "string" }),
    credentialId: text().notNull().default(""),
    credentialUrl: text().notNull().default(""),
    documentId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("accomplishments_kind_idx").on(t.kind, t.status, t.sortOrder)],
);

export const accomplishmentTranslations = pgTable(
  "accomplishment_translations",
  {
    accomplishmentId: uuid()
      .notNull()
      .references(() => accomplishments.id, { onDelete: "cascade" }),
    locale: localeEnum().notNull(),
    title: text().notNull().default(""),
    issuer: text().notNull().default(""),
    description: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.accomplishmentId, t.locale] })],
);

/* -------------------------------------------------------------------------- */
/* Contact messages                                                           */
/* -------------------------------------------------------------------------- */

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull(),
    company: text().notNull().default(""),
    subject: text().notNull().default(""),
    message: text().notNull(),
    locale: localeEnum().notNull().default("en"),
    status: messageStatusEnum().notNull().default("new"),
    /** HMAC of the sender IP: lets us spot abuse without storing the address. */
    ipHash: text().notNull().default(""),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp({ withTimezone: true }),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Relations (for relational queries)                                         */
/* -------------------------------------------------------------------------- */

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({ sessions: many(sessions) }));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(adminUsers, { fields: [sessions.userId], references: [adminUsers.id] }),
}));

export const profileRelations = relations(profile, ({ one, many }) => ({
  photo: one(mediaAssets, { fields: [profile.photoId], references: [mediaAssets.id], relationName: "photo" }),
  cvEn: one(mediaAssets, { fields: [profile.cvEnId], references: [mediaAssets.id], relationName: "cvEn" }),
  cvAr: one(mediaAssets, { fields: [profile.cvArId], references: [mediaAssets.id], relationName: "cvAr" }),
  translations: many(profileTranslations),
}));
export const profileTranslationsRelations = relations(profileTranslations, ({ one }) => ({
  profile: one(profile, { fields: [profileTranslations.profileId], references: [profile.id] }),
}));

export const siteSettingsRelations = relations(siteSettings, ({ one, many }) => ({
  ogImage: one(mediaAssets, { fields: [siteSettings.ogImageId], references: [mediaAssets.id] }),
  translations: many(siteSettingsTranslations),
}));
export const siteSettingsTranslationsRelations = relations(siteSettingsTranslations, ({ one }) => ({
  settings: one(siteSettings, {
    fields: [siteSettingsTranslations.settingsId],
    references: [siteSettings.id],
  }),
}));

export const skillCategoriesRelations = relations(skillCategories, ({ many }) => ({ skills: many(skills) }));
export const skillsRelations = relations(skills, ({ one, many }) => ({
  category: one(skillCategories, { fields: [skills.categoryId], references: [skillCategories.id] }),
  projects: many(projectSkills),
  experiences: many(experienceSkills),
}));

export const projectCategoriesRelations = relations(projectCategories, ({ many }) => ({
  projects: many(projects),
}));
export const projectsRelations = relations(projects, ({ one, many }) => ({
  category: one(projectCategories, { fields: [projects.categoryId], references: [projectCategories.id] }),
  translations: many(projectTranslations),
  images: many(projectImages),
  skills: many(projectSkills),
}));
export const projectTranslationsRelations = relations(projectTranslations, ({ one }) => ({
  project: one(projects, { fields: [projectTranslations.projectId], references: [projects.id] }),
}));
export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, { fields: [projectImages.projectId], references: [projects.id] }),
  media: one(mediaAssets, { fields: [projectImages.mediaId], references: [mediaAssets.id] }),
}));
export const projectSkillsRelations = relations(projectSkills, ({ one }) => ({
  project: one(projects, { fields: [projectSkills.projectId], references: [projects.id] }),
  skill: one(skills, { fields: [projectSkills.skillId], references: [skills.id] }),
}));

export const educationRelations = relations(education, ({ one, many }) => ({
  logo: one(mediaAssets, { fields: [education.logoId], references: [mediaAssets.id] }),
  translations: many(educationTranslations),
}));
export const educationTranslationsRelations = relations(educationTranslations, ({ one }) => ({
  education: one(education, { fields: [educationTranslations.educationId], references: [education.id] }),
}));

export const experiencesRelations = relations(experiences, ({ one, many }) => ({
  logo: one(mediaAssets, { fields: [experiences.logoId], references: [mediaAssets.id] }),
  translations: many(experienceTranslations),
  skills: many(experienceSkills),
}));
export const experienceTranslationsRelations = relations(experienceTranslations, ({ one }) => ({
  experience: one(experiences, {
    fields: [experienceTranslations.experienceId],
    references: [experiences.id],
  }),
}));
export const experienceSkillsRelations = relations(experienceSkills, ({ one }) => ({
  experience: one(experiences, { fields: [experienceSkills.experienceId], references: [experiences.id] }),
  skill: one(skills, { fields: [experienceSkills.skillId], references: [skills.id] }),
}));

export const accomplishmentsRelations = relations(accomplishments, ({ one, many }) => ({
  document: one(mediaAssets, { fields: [accomplishments.documentId], references: [mediaAssets.id] }),
  translations: many(accomplishmentTranslations),
}));
export const accomplishmentTranslationsRelations = relations(accomplishmentTranslations, ({ one }) => ({
  accomplishment: one(accomplishments, {
    fields: [accomplishmentTranslations.accomplishmentId],
    references: [accomplishments.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  projectImages: many(projectImages),
}));
