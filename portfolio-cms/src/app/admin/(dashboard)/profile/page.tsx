import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getProfileEditor } from "@/server/admin/queries";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const data = await getProfileEditor();
  return (
    <>
      <PageHeader
        title="Profile"
        description="Your name, title and introduction for the top of the home page, plus the contact details you choose to publish."
      />
      <ProfileForm initial={data.input} />
    </>
  );
}
