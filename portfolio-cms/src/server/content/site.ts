import { cacheLife, cacheTag } from "next/cache";

import type { Locale } from "@/lib/i18n/config";
import type { SectionKey } from "@/lib/types/content";

import {
  getAccomplishments,
  getEducation,
  getExperience,
  getProfile,
  getProjects,
  getSettings,
  getSkills,
  getSocialLinks,
} from "./public";
import { TAGS } from "./tags";

/** Everything the home page and the site chrome need, in one cached call. */
export async function getSiteData(locale: Locale) {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.all);

  const [settings, profile, social, projects, skills, experience, education, accomplishments] =
    await Promise.all([
      getSettings(locale),
      getProfile(locale),
      getSocialLinks(),
      getProjects(locale),
      getSkills(locale),
      getExperience(locale),
      getEducation(locale),
      getAccomplishments(locale),
    ]);

  const hasContent: Record<SectionKey, boolean> = {
    about: Boolean(
      profile.bio.text ||
      profile.interests.text ||
      profile.careerGoals.text ||
      profile.disciplines.text ||
      profile.personalStatement.text,
    ),
    projects: projects.length > 0,
    skills: skills.length > 0,
    experience: experience.length > 0,
    education: education.length > 0,
    accomplishments: accomplishments.length > 0,
    contact: Boolean(
      profile.email || profile.phone || settings.contactFormEnabled || social.some((l) => l.showInContact),
    ),
  };

  // Sections render in the owner's order, only when switched on and non-empty.
  const sections = settings.sections.filter((s) => s.visible && hasContent[s.key]).map((s) => s.key);

  return { settings, profile, social, projects, skills, experience, education, accomplishments, sections };
}

export type SiteData = Awaited<ReturnType<typeof getSiteData>>;
