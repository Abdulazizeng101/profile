import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EntryList } from "@/components/admin/entry-list";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRange } from "@/lib/dates";
import { getExperienceList } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Experience" };

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  coop: "Co-op training",
  contract: "Contract",
  freelance: "Freelance",
  research: "Research",
  teaching: "Teaching",
  volunteer: "Volunteer",
  activity: "Technical activity",
};

export default async function ExperienceAdminPage() {
  const rows = await getExperienceList();
  const newButton = (
    <Button asChild variant="primary">
      <Link href="/admin/experience/new">
        <Plus /> Add experience
      </Link>
    </Button>
  );
  return (
    <>
      <PageHeader
        title="Experience and training"
        description="Jobs, internships, co-op training and technical activities. Planned roles are shown separately as Upcoming and never as completed experience."
        actions={newButton}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No experience yet"
          text="Add internships, co-op training, part-time work or technical activities."
          action={newButton}
        />
      ) : (
        <EntryList
          kind="experience"
          basePath="/admin/experience"
          label="Experience"
          rows={rows.map((r) => ({
            ...r,
            meta: (
              <>
                <span>{TYPE_LABELS[r.type]}</span>
                <span>
                  {formatRange(
                    r.startDate,
                    r.state === "current" ? null : r.endDate,
                    "en",
                    r.state === "current" ? "Present" : "",
                  )}
                </span>
                {r.state === "planned" ? (
                  <Badge tone="warning">Planned</Badge>
                ) : r.state === "current" ? (
                  <Badge tone="accent">Current</Badge>
                ) : null}
              </>
            ),
          }))}
        />
      )}
    </>
  );
}
