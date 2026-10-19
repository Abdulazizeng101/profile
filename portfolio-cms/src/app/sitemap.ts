import type { MetadataRoute } from "next";

import { getLastUpdated, getProjectSlugs, getSettings } from "@/server/content/public";
import { siteUrl } from "@/server/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [settings, projects, updated] = await Promise.all([
    getSettings("en"),
    getProjectSlugs(),
    getLastUpdated(),
  ]);
  if (!settings.allowIndexing) return [];

  const withAr = settings.arabicEnabled;
  const page = (path: string, lastModified: string, hasArabic = true, priority = 0.6) => ({
    url: `${base}/en${path}`,
    lastModified,
    priority,
    alternates: {
      languages: {
        en: `${base}/en${path}`,
        ...(withAr && hasArabic ? { ar: `${base}/ar${path}` } : {}),
      },
    },
  });

  return [
    page("", updated, true, 1),
    page("/projects", updated, true, 0.8),
    ...projects.map((p) => page(`/projects/${p.slug}`, p.updatedAt, p.hasArabic)),
  ];
}
