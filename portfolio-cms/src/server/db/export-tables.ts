/**
 * The tables that make up "your content", shared by the dashboard export and
 * the `content:export` / `content:import` scripts. Deliberately free of
 * `server-only` so command-line scripts can import it.
 *
 * Listed in dependency order (parents first): an import inserts them in this
 * order and deletes them in reverse. Credentials, sessions and rate limits are
 * excluded on purpose.
 */
import * as s from "./schema";

export const EXPORT_TABLES = {
  media_assets: s.mediaAssets,
  profile: s.profile,
  profile_translations: s.profileTranslations,
  site_settings: s.siteSettings,
  site_settings_translations: s.siteSettingsTranslations,
  social_links: s.socialLinks,
  skill_categories: s.skillCategories,
  skills: s.skills,
  project_categories: s.projectCategories,
  projects: s.projects,
  project_translations: s.projectTranslations,
  project_images: s.projectImages,
  project_skills: s.projectSkills,
  education: s.education,
  education_translations: s.educationTranslations,
  experiences: s.experiences,
  experience_translations: s.experienceTranslations,
  experience_skills: s.experienceSkills,
  accomplishments: s.accomplishments,
  accomplishment_translations: s.accomplishmentTranslations,
  contact_messages: s.contactMessages,
} as const;

export type ExportTableName = keyof typeof EXPORT_TABLES;

export const EXPORT_FORMAT = "portfolio-cms-export";
export const EXPORT_VERSION = 1;

export type ContentExport = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  note?: string;
  tables: Partial<Record<ExportTableName, Record<string, unknown>[]>>;
};
