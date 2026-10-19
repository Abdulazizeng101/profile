import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getSettingsEditor } from "@/server/admin/queries";

import { SeoForm } from "./seo-form";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoPage() {
  const settings = await getSettingsEditor();
  return (
    <>
      <PageHeader
        title="SEO and sharing"
        description="How your site appears in search results and when a link is shared on LinkedIn, WhatsApp or X. Project pages use their own title, description and cover image."
      />
      <SeoForm initial={settings.seo} ogImage={settings.ogImage} />
    </>
  );
}
