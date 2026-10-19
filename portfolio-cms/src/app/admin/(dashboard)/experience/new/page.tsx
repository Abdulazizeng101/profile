import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import type { ExperienceInput } from "@/lib/validation/content";
import { getSkillOptions } from "@/server/admin/queries";

import { ExperienceEditor } from "../experience-editor";

export const metadata: Metadata = { title: "Add experience" };

const EMPTY = {
  organization: "",
  role: "",
  location: "",
  description: "",
  responsibilities: "",
  achievements: "",
};

export default async function NewExperiencePage() {
  const skills = await getSkillOptions();
  const initial: ExperienceInput = {
    status: "draft",
    type: "internship",
    state: "completed",
    isRemote: false,
    startDate: "",
    endDate: "",
    logoId: null,
    url: "",
    skillIds: [],
    translations: { en: { ...EMPTY }, ar: { ...EMPTY } },
  };
  return (
    <>
      <PageHeader
        title="Add experience"
        back={
          <Link href="/admin/experience" className="link w-fit text-sm text-muted">
            All experience
          </Link>
        }
      />
      <ExperienceEditor entryId={null} initial={initial} logo={null} skills={skills} />
    </>
  );
}
