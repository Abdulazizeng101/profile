import "server-only";

import { Globe, Link2 } from "lucide-react";
import * as simpleIcons from "simple-icons";

import { cn } from "@/lib/utils";

type SimpleIcon = { slug: string; title: string; path: string };

let bySlug: Map<string, SimpleIcon> | undefined;

/** Simple Icons glyphs by slug (server-only, so the icon set never ships to browsers). */
function iconFor(slug: string): SimpleIcon | undefined {
  if (!bySlug) {
    bySlug = new Map();
    for (const value of Object.values(simpleIcons) as unknown[]) {
      const icon = value as Partial<SimpleIcon>;
      if (icon && typeof icon.slug === "string" && typeof icon.path === "string") {
        bySlug.set(icon.slug, icon as SimpleIcon);
      }
    }
  }
  return bySlug.get(slug);
}

export function hasTechIcon(slug: string): boolean {
  return Boolean(slug && iconFor(slug));
}

/** SVG path data for a Simple Icons slug, or "" (lets client components draw the icon cheaply). */
export function techIconPath(slug: string): string {
  return (slug && iconFor(slug)?.path) || "";
}

export function TechIcon({ slug, className }: { slug: string; className?: string }) {
  const icon = slug ? iconFor(slug) : undefined;
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("size-4 fill-current", className)}
    >
      <path d={icon.path} />
    </svg>
  );
}

const PLATFORM_ICON: Record<string, string> = {
  github: "github",
  x: "x",
  gitlab: "gitlab",
  stackoverflow: "stackoverflow",
  medium: "medium",
  devto: "devdotto",
  leetcode: "leetcode",
  kaggle: "kaggle",
  youtube: "youtube",
};

export const PLATFORM_NAMES: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X",
  gitlab: "GitLab",
  stackoverflow: "Stack Overflow",
  medium: "Medium",
  devto: "DEV",
  leetcode: "LeetCode",
  kaggle: "Kaggle",
  youtube: "YouTube",
  website: "Website",
  other: "Link",
};

export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const cls = cn("size-[18px]", className);
  if (platform === "linkedin") {
    // Simplified "in" mark.
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={cn(cls, "fill-current")}>
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />
      </svg>
    );
  }
  const slug = PLATFORM_ICON[platform];
  if (slug && iconFor(slug)) return <TechIcon slug={slug} className={cls} />;
  if (platform === "website") return <Globe className={cls} aria-hidden="true" strokeWidth={1.75} />;
  return <Link2 className={cls} aria-hidden="true" strokeWidth={1.75} />;
}
