import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status";
import { getExperienceEditor, getSkillOptions } from "@/server/admin/queries";

import { ExperienceEditor } from "../experience-editor";

export const metadata: Metadata = { title: "Edit experience" };

export default async function EditExperiencePage({ params }: PageProps<"/admin/experience/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, skills] = await Promise.all([getExperienceEditor(id), getSkillOptions()]);
  if (!data) notFound();
  const en = data.input.translations.en;
  return (
    <>
      <PageHeader
        title={[en.role, en.organization].filter(Boolean).join(" at ") || "Experience"}
        description={<StatusBadge status={data.input.status ?? "draft"} />}
        back={
          <Link href="/admin/experience" className="link w-fit text-sm text-muted">
            All experience
          </Link>
        }
      />
      <ExperienceEditor key={id} entryId={id} initial={data.input} logo={data.logo} skills={skills} />
    </>
  );
}
