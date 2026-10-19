import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status";
import {
  getProjectCategories,
  getProjectImages,
  getSkillOptions,
  loadProjectInput,
} from "@/server/admin/queries";

import { ProjectEditor } from "../project-editor";
import { ProjectImages } from "../project-images";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [input, categories, skills, images] = await Promise.all([
    loadProjectInput(id),
    getProjectCategories(),
    getSkillOptions(),
    getProjectImages(id),
  ]);
  if (!input) notFound();

  return (
    <>
      <PageHeader
        title={input.translations.en.title || "Untitled project"}
        description={<StatusBadge status={input.status ?? "draft"} />}
        back={
          <Link href="/admin/projects" className="link w-fit text-sm text-muted">
            All projects
          </Link>
        }
      />
      <div className="grid gap-6">
        <ProjectImages projectId={id} images={images} />
        {/* key forces a fresh form after server-side changes such as a duplicate */}
        <ProjectEditor key={id} projectId={id} initial={input} categories={categories} skills={skills} />
      </div>
    </>
  );
}
