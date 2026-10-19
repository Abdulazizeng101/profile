import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getProjectCategories, getProjectsList } from "@/server/admin/queries";

import { CategoryManager } from "./category-manager";
import { ProjectList } from "./project-list";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsAdminPage() {
  const [projects, categories] = await Promise.all([getProjectsList(), getProjectCategories()]);
  return (
    <>
      <PageHeader
        title="Projects"
        description="Drag to set the order used on the site. Featured projects lead the home page. Only published projects are public."
        actions={
          <Button asChild variant="primary">
            <Link href="/admin/projects/new">
              <Plus /> New project
            </Link>
          </Button>
        }
      />
      <div className="grid gap-10">
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            text="Add the projects you're proudest of. Two or three well-documented projects beat ten thin ones."
            action={
              <Button asChild variant="primary">
                <Link href="/admin/projects/new">
                  <Plus /> New project
                </Link>
              </Button>
            }
          />
        ) : (
          <ProjectList projects={projects} />
        )}
        <CategoryManager categories={categories} />
      </div>
    </>
  );
}
