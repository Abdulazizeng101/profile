"use client";

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { deleteEntry, reorderEntries, setEntryStatus, type EntryKind } from "@/server/actions/admin/entries";

import { SortableList } from "./sortable-list";
import { ArabicBadge, StatusBadge } from "./status";
import { useAction } from "./use-entity-form";

export type EntryRow = {
  id: string;
  title: string;
  subtitle: string;
  status: "draft" | "published";
  hasArabic: boolean;
  meta?: ReactNode;
};

/** Sortable list with edit / publish / delete for education, experience and accomplishments. */
export function EntryList({
  kind,
  basePath,
  rows,
  label,
}: {
  kind: EntryKind;
  basePath: string;
  rows: EntryRow[];
  label: string;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [deleting, setDeleting] = useState<EntryRow | null>(null);

  return (
    <>
      <SortableList
        label={label}
        items={rows}
        onReorder={(ids) => reorderEntries(kind, ids)}
        renderItem={(row) => (
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid min-w-0 flex-[1_1_12rem] gap-0.5">
              <Link href={`${basePath}/${row.id}`} className="truncate font-medium hover:underline">
                {row.title}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                <StatusBadge status={row.status} />
                <ArabicBadge present={row.hasArabic} />
                {row.subtitle ? <span>{row.subtitle}</span> : null}
                {row.meta}
              </div>
            </div>
            <div className="ms-auto flex items-center gap-0.5">
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`${basePath}/${row.id}`} aria-label={`Edit ${row.title}`}>
                  <Pencil />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                title={row.status === "published" ? "Unpublish" : "Publish"}
                aria-label={`${row.status === "published" ? "Unpublish" : "Publish"} ${row.title}`}
                onClick={() =>
                  run(
                    () => setEntryStatus(kind, row.id, row.status === "published" ? "draft" : "published"),
                    () => router.refresh(),
                  )
                }
              >
                {row.status === "published" ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${row.title}`}
                onClick={() => setDeleting(row)}
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
        description="This entry is removed permanently, in both languages."
        confirmLabel="Delete"
        onConfirm={() =>
          deleting &&
          run(
            () => deleteEntry(kind, deleting.id),
            () => router.refresh(),
          )
        }
      />
    </>
  );
}
