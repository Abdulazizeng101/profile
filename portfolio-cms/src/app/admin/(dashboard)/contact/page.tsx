import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { getSettingsEditor, getSocialLinksAdmin } from "@/server/admin/queries";

import { ContactSettingsForm } from "./contact-settings-form";
import { SocialLinksManager } from "./social-links";

export const metadata: Metadata = { title: "Links & contact" };

export default async function ContactAdminPage() {
  const [links, settings] = await Promise.all([getSocialLinksAdmin(), getSettingsEditor()]);
  return (
    <>
      <PageHeader
        title="Links & contact"
        description={
          <>
            Professional profiles and the contact section. Your email and phone number are set (and published)
            on the{" "}
            <Link href="/admin/profile" className="link">
              Profile
            </Link>{" "}
            page.
          </>
        }
      />
      <div className="grid gap-6">
        <SocialLinksManager links={links} />
        <ContactSettingsForm initial={settings.contact} />
      </div>
    </>
  );
}
