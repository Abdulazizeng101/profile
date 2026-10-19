import type { Locale } from "@/lib/i18n/config";

import type { DocumentView, ImageView } from "./media";

/** A piece of content plus the language it is actually written in. */
export type LocalText = { text: string; lang: Locale };

export const EMPTY_TEXT: LocalText = { text: "", lang: "en" };

export type SectionKey =
  "about" | "projects" | "skills" | "experience" | "education" | "accomplishments" | "contact";

export type SiteSettingsView = {
  defaultTheme: "dark" | "light" | "system";
  accent: "brass" | "gulf" | "sage" | "cobalt";
  sections: { key: SectionKey; visible: boolean }[];
  showProjectsButton: boolean;
  showCvButton: boolean;
  showContactButton: boolean;
  contactFormEnabled: boolean;
  arabicEnabled: boolean;
  fallbackMode: "english" | "hide";
  allowIndexing: boolean;
  siteTitle: LocalText;
  metaDescription: LocalText;
  contactHeading: LocalText;
  contactText: LocalText;
  footerNote: LocalText;
  ogImage: ImageView | null;
  updatedAt: string;
};

export type ProfileView = {
  fullName: LocalText;
  headline: LocalText;
  intro: LocalText;
  location: LocalText | null;
  languages: LocalText;
  availability: { kind: "open" | "selective" | "not_looking" | "custom"; label: LocalText } | null;
  bio: LocalText;
  interests: LocalText;
  careerGoals: LocalText;
  disciplines: LocalText;
  personalStatement: LocalText;
  photo: ImageView | null;
  /** Whether a CV exists for the requested language (or the English fallback). */
  cv: { available: boolean; lang: Locale | null };
  email: string | null;
  phone: string | null;
};

export type SocialLinkView = {
  id: string;
  platform: string;
  label: string;
  url: string;
  showInHero: boolean;
  showInContact: boolean;
  showInFooter: boolean;
};

export type TagView = { id: string; name: string; iconSlug: string };

export type ProjectCardView = {
  id: string;
  slug: string;
  title: LocalText;
  summary: LocalText;
  stage: "completed" | "in_progress" | "maintained" | "prototype" | "archived";
  category: { slug: string; name: string } | null;
  isFeatured: boolean;
  startDate: string | null;
  endDate: string | null;
  cover: ImageView | null;
  technologies: TagView[];
  repoUrl: string;
  liveUrl: string;
  isDraft: boolean;
};

export type ProjectDetailView = ProjectCardView & {
  overview: LocalText;
  problem: LocalText;
  solution: LocalText;
  role: LocalText;
  features: LocalText;
  architecture: LocalText;
  challenges: LocalText;
  videoUrl: string;
  gallery: { image: ImageView; caption: LocalText }[];
  diagrams: { image: ImageView; caption: LocalText }[];
  updatedAt: string;
};

export type SkillGroupView = {
  id: string;
  name: LocalText;
  skills: { id: string; name: string; iconSlug: string; proficiency: string | null }[];
};

export type ExperienceView = {
  id: string;
  type: string;
  state: "planned" | "current" | "completed";
  isRemote: boolean;
  startDate: string | null;
  endDate: string | null;
  organization: LocalText;
  role: LocalText;
  location: LocalText;
  description: LocalText;
  responsibilities: LocalText;
  achievements: LocalText;
  url: string;
  logo: ImageView | null;
  technologies: TagView[];
  isDraft: boolean;
};

export type EducationView = {
  id: string;
  educationStatus: "graduated" | "in_progress";
  startDate: string | null;
  endDate: string | null;
  grade: string;
  institution: LocalText;
  degree: LocalText;
  field: LocalText;
  location: LocalText;
  description: LocalText;
  courses: LocalText;
  honors: LocalText;
  url: string;
  logo: ImageView | null;
  isDraft: boolean;
};

export type AccomplishmentView = {
  id: string;
  kind: "certification" | "course" | "award" | "competition" | "publication" | "volunteer";
  issuedOn: string | null;
  expiresOn: string | null;
  credentialId: string;
  credentialUrl: string;
  document: DocumentView | null;
  title: LocalText;
  issuer: LocalText;
  description: LocalText;
  isDraft: boolean;
};
