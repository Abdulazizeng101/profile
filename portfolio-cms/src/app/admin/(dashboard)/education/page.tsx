import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EntryList } from "@/components/admin/entry-list";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { formatRange } from "@/lib/dates";
import { getEducationList } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Education" };

export default async function EducationAdminPage() {
  const rows = await getEducationList();
  const newButton = (
    <Button asChild variant="primary">
      <Link href="/admin/education/new">
        <Plus /> Add education
      </Link>
    </Button>
  );
  return (
    <>
      <PageHeader
        title="Education"
        description="Your KFUPM entry was created as a draft. Check the details, add your graduation date, then publish it."
        actions={newButton}
      />
      {rows.length === 0 ? (
        <EmptyState title="No education entries" action={newButton} />
      ) : (
        <EntryList
          kind="education"
          basePath="/admin/education"
          label="Education"
          rows={rows.map((r) => ({ ...r, meta: <span>{formatRange(r.startDate, r.endDate, "en")}</span> }))}
        />
      )}
    </>
  );
}
