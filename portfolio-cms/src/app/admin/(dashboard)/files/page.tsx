import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getProfileEditor } from "@/server/admin/queries";

import { CvManager } from "./cv-manager";

export const metadata: Metadata = { title: "CV & documents" };

export default async function FilesPage() {
  const profile = await getProfileEditor();
  return (
    <>
      <PageHeader
        title="CV & documents"
        description="The Download CV button always serves the file published here, through the stable links /cv and /cv?lang=ar. Replacing the file updates every link instantly."
      />
      <CvManager cvEn={profile.cvEn} cvAr={profile.cvAr} />
    </>
  );
}
