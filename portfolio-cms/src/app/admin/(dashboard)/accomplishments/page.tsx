import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EntryList } from "@/components/admin/entry-list";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { formatMonthYear } from "@/lib/dates";
import { getAccomplishmentList } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Certifications & awards" };

const KIND_LABELS: Record<string, string> = {
  certification: "Certification",
  course: "Course",
  award: "Award",
  competition: "Competition",
  publication: "Publication",
  volunteer: "Volunteer work",
};

export default async function AccomplishmentsAdminPage() {
  const rows = await getAccomplishmentList();
  const newButton = (
    <Button asChild variant="primary">
      <Link href="/admin/accomplishments/new">
        <Plus /> Add entry
      </Link>
    </Button>
  );
  return (
    <>
      <PageHeader
        title="Certifications & awards"
        description="Certifications, courses, awards, competitions, publications and volunteer work. Groups with nothing published are hidden on the site automatically."
        actions={newButton}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          text="Add only what you've actually earned or completed. You can attach a certificate PDF or a credential link."
          action={newButton}
        />
      ) : (
        <EntryList
          kind="accomplishment"
          basePath="/admin/accomplishments"
          label="Certifications and awards"
          rows={rows.map((r) => ({
            ...r,
            meta: (
              <>
                <span>{KIND_LABELS[r.kind]}</span>
                {r.issuedOn ? <span>{formatMonthYear(r.issuedOn, "en")}</span> : null}
              </>
            ),
          }))}
        />
      )}
    </>
  );
}
