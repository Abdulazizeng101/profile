import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getSkillsEditor } from "@/server/admin/queries";

import { SkillsManager } from "./skills-manager";

export const metadata: Metadata = { title: "Skills" };

export default async function SkillsPage() {
  const data = await getSkillsEditor();
  return (
    <>
      <PageHeader
        title="Skills"
        description="Grouped by category on the site. Proficiency labels are optional words, never percentages. Hidden skills can still be used as technology tags on projects."
      />
      <SkillsManager categories={data.categories} uncategorized={data.uncategorized} />
    </>
  );
}
