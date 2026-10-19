/**
 * Cache tags for public content. Every cached read is tagged with its own tag
 * plus `content`; admin mutations expire the tags they affect so the public
 * site updates immediately, without a redeploy.
 */
export const TAGS = {
  all: "content",
  settings: "settings",
  profile: "profile",
  social: "social",
  projects: "projects",
  skills: "skills",
  experience: "experience",
  education: "education",
  accomplishments: "accomplishments",
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];
