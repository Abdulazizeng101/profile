import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status";
import { getEducationEditor } from "@/server/admin/queries";

import { EducationEditor } from "../education-editor";

export const metadata: Metadata = { title: "Edit education" };

export default async function EditEducationPage({ params }: PageProps<"/admin/education/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getEducationEditor(id);
  if (!data) notFound();
  return (
    <>
      <PageHeader
        title={data.input.translations.en.institution || "Education"}
        description={<StatusBadge status={data.input.status ?? "draft"} />}
        back={
          <Link href="/admin/education" className="link w-fit text-sm text-muted">
            All education
          </Link>
        }
      />
      <EducationEditor key={id} entryId={id} initial={data.input} logo={data.logo} />
    </>
  );
}
