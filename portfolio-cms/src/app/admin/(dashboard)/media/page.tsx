import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getMediaLibrary, getProfileEditor } from "@/server/admin/queries";

import { MediaLibrary } from "./media-library";
import { ProfilePhoto } from "./profile-photo";

export const metadata: Metadata = { title: "Photo & media" };

export default async function MediaPage() {
  const [profile, library] = await Promise.all([getProfileEditor(), getMediaLibrary()]);
  return (
    <>
      <PageHeader
        title="Photo & media"
        description="Your profile photo and every file you've uploaded. Images are converted to fast-loading WebP in several sizes, and location data in photos is removed."
      />
      <div className="grid gap-6">
        <ProfilePhoto current={profile.photo} />
        <MediaLibrary items={library} />
      </div>
    </>
  );
}
