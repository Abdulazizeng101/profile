import type { MetadataRoute } from "next";

import { getSettings } from "@/server/content/public";
import { siteUrl } from "@/server/env";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings("en");
  const base = siteUrl();
  if (!settings.allowIndexing) {
    // Search engine visibility is off in Settings > SEO (the default for a new site).
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/media/documents/"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
