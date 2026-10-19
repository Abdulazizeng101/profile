import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status";
import { getAccomplishmentEditor } from "@/server/admin/queries";

import { AccomplishmentEditor } from "../accomplishment-editor";

export const metadata: Metadata = { title: "Edit entry" };

export default async function EditAccomplishmentPage({ params }: PageProps<"/admin/accomplishments/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getAccomplishmentEditor(id);
  if (!data) notFound();
  return (
    <>
      <PageHeader
        title={data.input.translations.en.title || "Entry"}
        description={<StatusBadge status={data.input.status ?? "draft"} />}
        back={
          <Link href="/admin/accomplishments" className="link w-fit text-sm text-muted">
            All certifications & awards
          </Link>
        }
      />
      <AccomplishmentEditor key={id} entryId={id} initial={data.input} document={data.document} />
    </>
  );
}
