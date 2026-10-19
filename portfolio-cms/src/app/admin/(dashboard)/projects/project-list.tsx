"use client";

import { Copy, Eye, EyeOff, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SortableList } from "@/components/admin/sortable-list";
import { ArabicBadge, StatusBadge } from "@/components/admin/status";
import { useAction } from "@/components/admin/use-entity-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { ImageView } from "@/lib/types/media";
import {
  deleteProject,
  duplicateProject,
  reorderProjects,
  setProjectStatus,
} from "@/server/actions/admin/projects";

type Row = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  isFeatured: boolean;
  isSample: boolean;
  category: string | null;
  hasArabic: boolean;
  cover: ImageView | null;
};

export function ProjectList({ projects }: { projects: Row[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [deleting, setDeleting] = useState<Row | null>(null);

  return (
    <>
      <SortableList
        label="Projects"
        items={projects}
        onReorder={reorderProjects}
        renderItem={(p) => (
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-10 w-16 shrink-0 overflow-hidden rounded-[3px] border border-border bg-surface-2">
              {p.cover ? (
                <img
                  src={p.cover.src}
                  srcSet={p.cover.srcSet}
                  sizes="64px"
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="grid min-w-0 flex-[1_1_12rem] gap-0.5">
              <Link href={`/admin/projects/${p.id}`} className="truncate font-medium hover:underline">
                {p.title}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                <StatusBadge status={p.status} />
                {p.isFeatured ? (
                  <Badge tone="accent">
                    <Star className="size-3" /> Featured
                  </Badge>
                ) : null}
                {p.isSample ? <Badge tone="warning">Sample content</Badge> : null}
                <ArabicBadge present={p.hasArabic} />
                {p.category ? <span>{p.category}</span> : null}
              </div>
            </div>
            <div className="ms-auto flex items-center gap-0.5">
              <Button asChild variant="ghost" size="icon-sm" title="Edit">
                <Link href={`/admin/projects/${p.id}`} aria-label={`Edit ${p.title}`}>
                  <Pencil />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                title={p.status === "published" ? "Unpublish" : "Publish"}
                aria-label={`${p.status === "published" ? "Unpublish" : "Publish"} ${p.title}`}
                onClick={() =>
                  run(
                    () => setProjectStatus(p.id, p.status === "published" ? "draft" : "published"),
                    () => router.refresh(),
                  )
                }
              >
                {p.status === "published" ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                title="Duplicate"
                aria-label={`Duplicate ${p.title}`}
                onClick={() =>
                  run(
                    () => duplicateProject(p.id),
                    (r) => r.data && router.push(`/admin/projects/${r.data.id}`),
                  )
                }
              >
                <Copy />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Delete"
                aria-label={`Delete ${p.title}`}
                onClick={() => setDeleting(p)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        )}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="The project and its text are removed permanently. Uploaded images stay in the media library."
        confirmLabel="Delete project"
        onConfirm={() =>
          deleting &&
          run(
            () => deleteProject(deleting.id),
            () => router.refresh(),
          )
        }
      />
    </>
  );
}
