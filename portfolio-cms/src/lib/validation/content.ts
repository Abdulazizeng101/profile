import { z } from "zod";

import {
  idList,
  line,
  markdown,
  nullableUuid,
  optionalDate,
  optionalEmail,
  optionalPhone,
  optionalUrl,
  publishStatus,
  requiredLine,
  requiredUrl,
  slug,
  todayIso,
} from "./common";

/* ------------------------------- helpers ---------------------------------- */

function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

/** English is the primary language and must be complete; Arabic is optional. */
function bilingual<En extends z.ZodTypeAny, Ar extends z.ZodTypeAny>(en: En, ar: Ar) {
  return z.object({ en, ar });
}

function dateOrder<T extends { startDate: string | null; endDate: string | null }>(
  value: T,
  ctx: z.RefinementCtx,
) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "The end date is before the start date." });
  }
}

/* -------------------------------- profile --------------------------------- */

const profileTextAr = z.object({
  fullName: line(100),
  headline: line(120),
  intro: line(400),
  location: line(100),
  availabilityLabel: line(60),
  languages: line(120),
});
const profileTextEn = profileTextAr.extend({
  fullName: requiredLine(100, "Your full name"),
  headline: requiredLine(120, "Your professional title"),
});

export const profileSchema = z.object({
  email: optionalEmail,
  phone: optionalPhone,
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  showLocation: z.boolean().default(false),
  availability: z.enum(["open", "selective", "not_looking", "custom"]).default("open"),
  showAvailability: z.boolean().default(true),
  translations: bilingual(profileTextEn, profileTextAr),
});
export type ProfileInput = z.input<typeof profileSchema>;

const aboutText = z.object({
  bio: markdown(8000),
  interests: markdown(4000),
  careerGoals: markdown(4000),
  disciplines: markdown(4000),
  personalStatement: markdown(1000),
});
export const aboutSchema = z.object({ translations: bilingual(aboutText, aboutText) });
export type AboutInput = z.input<typeof aboutSchema>;

export const profileMediaSchema = z.object({
  field: z.enum(["photoId", "cvEnId", "cvArId"]),
  mediaId: nullableUuid,
});

/* -------------------------------- projects -------------------------------- */

const projectTextAr = z.object({
  title: line(120),
  summary: line(300),
  overview: markdown(),
  problem: markdown(),
  solution: markdown(),
  role: markdown(),
  features: markdown(),
  architecture: markdown(),
  challenges: markdown(),
});
const projectTextEn = projectTextAr.extend({ title: requiredLine(120, "The project name") });

export const VIDEO_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "www.vimeo.com",
  "loom.com",
  "www.loom.com",
];

export const projectSchema = z
  .object({
    slug,
    status: publishStatus,
    stage: z.enum(["completed", "in_progress", "maintained", "prototype", "archived"]).default("completed"),
    categoryId: nullableUuid,
    isFeatured: z.boolean().default(false),
    isSample: z.boolean().default(false),
    startDate: optionalDate,
    endDate: optionalDate,
    repoUrl: optionalUrl,
    liveUrl: optionalUrl,
    videoUrl: optionalUrl.refine((value) => value === "" || VIDEO_HOSTS.includes(hostOf(value)), {
      message: "Use a YouTube, Vimeo or Loom link.",
    }),
    skillIds: idList(40),
    translations: bilingual(projectTextEn, projectTextAr),
  })
  .superRefine(dateOrder)
  .superRefine((value, ctx) => {
    if (value.status !== "published") return;
    if (value.isSample) {
      ctx.addIssue({
        code: "custom",
        path: ["isSample"],
        message: "Sample content can't be published. Replace it, then clear the sample flag.",
      });
    }
    if (!value.translations.en.summary) {
      ctx.addIssue({
        code: "custom",
        path: ["translations", "en", "summary"],
        message: "Add a short description before publishing.",
      });
    }
  });
export type ProjectInput = z.input<typeof projectSchema>;

export const projectImageSchema = z.object({
  id: z.uuid(),
  role: z.enum(["gallery", "diagram"]),
  captionEn: line(200),
  captionAr: line(200),
});

export const projectCategorySchema = z.object({
  nameEn: requiredLine(60, "The category name"),
  nameAr: line(60),
  slug,
});

/* --------------------------------- skills --------------------------------- */

export const skillCategorySchema = z.object({
  nameEn: requiredLine(60, "The category name"),
  nameAr: line(60),
  isVisible: z.boolean().default(true),
});

export const skillSchema = z.object({
  name: requiredLine(60, "The skill name"),
  nameAr: line(60),
  categoryId: nullableUuid,
  iconSlug: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .regex(/^[a-z0-9]*$/, { message: "Use the icon's slug, e.g. typescript." })
    .default(""),
  proficiency: z.enum(["learning", "familiar", "proficient", "advanced"]).nullable().default(null),
  isVisible: z.boolean().default(true),
});

/* -------------------------------- education ------------------------------- */

const educationTextAr = z.object({
  institution: line(150),
  degree: line(120),
  field: line(120),
  location: line(100),
  description: markdown(6000),
  courses: markdown(4000),
  honors: markdown(4000),
});
const educationTextEn = educationTextAr.extend({
  institution: requiredLine(150, "The institution"),
  degree: requiredLine(120, "The degree"),
});

export const educationSchema = z
  .object({
    status: publishStatus,
    educationStatus: z.enum(["graduated", "in_progress"]).default("graduated"),
    startDate: optionalDate,
    endDate: optionalDate,
    grade: line(40),
    logoId: nullableUuid,
    url: optionalUrl,
    translations: bilingual(educationTextEn, educationTextAr),
  })
  .superRefine(dateOrder)
  .superRefine((value, ctx) => {
    if (value.educationStatus === "graduated" && value.endDate && value.endDate > todayIso()) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "A graduation date in the future means the degree is still in progress.",
      });
    }
  });
export type EducationInput = z.input<typeof educationSchema>;

/* -------------------------------- experience ------------------------------ */

const experienceTextAr = z.object({
  organization: line(150),
  role: line(120),
  location: line(100),
  description: markdown(6000),
  responsibilities: markdown(6000),
  achievements: markdown(6000),
});
const experienceTextEn = experienceTextAr.extend({
  organization: requiredLine(150, "The company or organization"),
  role: requiredLine(120, "The position"),
});

export const EXPERIENCE_TYPES = [
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
] as const;

export const experienceSchema = z
  .object({
    status: publishStatus,
    type: z.enum(EXPERIENCE_TYPES).default("full_time"),
    state: z.enum(["planned", "current", "completed"]).default("completed"),
    isRemote: z.boolean().default(false),
    startDate: optionalDate,
    endDate: optionalDate,
    logoId: nullableUuid,
    url: optionalUrl,
    skillIds: idList(40),
    translations: bilingual(experienceTextEn, experienceTextAr),
  })
  .superRefine(dateOrder)
  .superRefine((value, ctx) => {
    // Keeps the public site honest: a role's label must agree with its dates.
    const today = todayIso();
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (value.state === "completed") {
      if (!value.startDate) issue("startDate", "Completed experience needs a start date.");
      if (!value.endDate) issue("endDate", "Completed experience needs an end date.");
      else if (value.endDate > today)
        issue("endDate", "This end date is in the future. Mark the role as Current instead.");
    }
    if (value.state === "current") {
      if (!value.startDate) issue("startDate", "Add the date you started.");
      else if (value.startDate > today)
        issue("startDate", "This role hasn't started yet. Mark it as Planned instead.");
      if (value.endDate && value.endDate < today)
        issue("endDate", "This role has ended. Mark it as Completed instead.");
    }
    if (value.state === "planned" && value.startDate && value.startDate <= today) {
      issue("startDate", "This start date has passed. Mark the role as Current or Completed instead.");
    }
  });
export type ExperienceInput = z.input<typeof experienceSchema>;

/* ------------------------------ accomplishments --------------------------- */

export const ACCOMPLISHMENT_KINDS = [
  "certification",
  "course",
  "award",
  "competition",
  "publication",
  "volunteer",
] as const;

const accomplishmentTextAr = z.object({
  title: line(200),
  issuer: line(150),
  description: markdown(4000),
});
const accomplishmentTextEn = accomplishmentTextAr.extend({ title: requiredLine(200, "The title") });

export const accomplishmentSchema = z
  .object({
    status: publishStatus,
    kind: z.enum(ACCOMPLISHMENT_KINDS),
    issuedOn: optionalDate,
    expiresOn: optionalDate,
    credentialId: line(120),
    credentialUrl: optionalUrl,
    documentId: nullableUuid,
    translations: bilingual(accomplishmentTextEn, accomplishmentTextAr),
  })
  .superRefine((value, ctx) => {
    if (value.issuedOn && value.issuedOn > todayIso()) {
      ctx.addIssue({ code: "custom", path: ["issuedOn"], message: "The issue date can't be in the future." });
    }
    if (value.issuedOn && value.expiresOn && value.expiresOn < value.issuedOn) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresOn"],
        message: "The expiry date is before the issue date.",
      });
    }
  });
export type AccomplishmentInput = z.input<typeof accomplishmentSchema>;

/* ------------------------------- social links ----------------------------- */

export const SOCIAL_PLATFORMS = [
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
] as const;

export const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  label: line(40),
  url: requiredUrl,
  showInHero: z.boolean().default(true),
  showInContact: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  isVisible: z.boolean().default(true),
});

/* ------------------------------ site settings ----------------------------- */

export const SECTION_KEYS = [
  "about",
  "projects",
  "skills",
  "experience",
  "education",
  "accomplishments",
  "contact",
] as const;

export const appearanceSchema = z.object({
  defaultTheme: z.enum(["dark", "light", "system"]),
  accent: z.enum(["brass", "gulf", "sage", "cobalt"]),
  sections: z
    .array(z.object({ key: z.enum(SECTION_KEYS), visible: z.boolean() }))
    .length(SECTION_KEYS.length)
    .refine((list) => new Set(list.map((s) => s.key)).size === SECTION_KEYS.length, {
      message: "Each section must appear exactly once.",
    }),
  showProjectsButton: z.boolean(),
  showCvButton: z.boolean(),
  showContactButton: z.boolean(),
});

const contactText = z.object({ contactHeading: line(120), contactText: line(600), footerNote: line(200) });
export const contactSettingsSchema = z.object({
  contactFormEnabled: z.boolean(),
  translations: bilingual(contactText, contactText),
});

const seoText = z.object({ siteTitle: line(70), metaDescription: line(200) });
export const seoSchema = z.object({
  allowIndexing: z.boolean(),
  ogImageId: nullableUuid,
  translations: bilingual(seoText, seoText),
});

export const localizationSchema = z.object({
  arabicEnabled: z.boolean(),
  fallbackMode: z.enum(["english", "hide"]),
});

/* -------------------------------- reordering ------------------------------ */

export const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });
