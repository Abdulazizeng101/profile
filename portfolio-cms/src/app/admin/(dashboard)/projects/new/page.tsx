import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import type { ProjectInput } from "@/lib/validation/content";
import { getProjectCategories, getSkillOptions } from "@/server/admin/queries";

import { ProjectEditor } from "../project-editor";

export const metadata: Metadata = { title: "New project" };

const EMPTY_TEXT = {
  title: "",
  summary: "",
  overview: "",
  problem: "",
  solution: "",
  role: "",
  features: "",
  architecture: "",
  challenges: "",
};

export default async function NewProjectPage() {
  const [categories, skills] = await Promise.all([getProjectCategories(), getSkillOptions()]);
  const initial: ProjectInput = {
    slug: "",
    status: "draft",
    stage: "completed",
    categoryId: null,
    isFeatured: false,
    isSample: false,
    startDate: "",
    endDate: "",
    repoUrl: "",
    liveUrl: "",
    videoUrl: "",
    skillIds: [],
    translations: { en: { ...EMPTY_TEXT }, ar: { ...EMPTY_TEXT } },
  };
  return (
    <>
      <PageHeader
        title="New project"
        description="Save a draft first; you can add screenshots and diagrams once the project exists."
        back={
          <Link href="/admin/projects" className="link w-fit text-sm text-muted">
            All projects
          </Link>
        }
      />
      <ProjectEditor projectId={null} initial={initial} categories={categories} skills={skills} />
    </>
  );
}
