import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import type { EducationInput } from "@/lib/validation/content";

import { EducationEditor } from "../education-editor";

export const metadata: Metadata = { title: "Add education" };

const EMPTY = {
  institution: "",
  degree: "",
  field: "",
  location: "",
  description: "",
  courses: "",
  honors: "",
};

export default function NewEducationPage() {
  const initial: EducationInput = {
    status: "draft",
    educationStatus: "graduated",
    startDate: "",
    endDate: "",
    grade: "",
    logoId: null,
    url: "",
    translations: { en: { ...EMPTY }, ar: { ...EMPTY } },
  };
  return (
    <>
      <PageHeader
        title="Add education"
        back={
          <Link href="/admin/education" className="link w-fit text-sm text-muted">
            All education
          </Link>
        }
      />
      <EducationEditor entryId={null} initial={initial} logo={null} />
    </>
  );
}
