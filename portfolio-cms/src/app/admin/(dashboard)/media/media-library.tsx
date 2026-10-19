"use client";

import { FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/admin/page-header";
import { useAction } from "@/components/admin/use-entity-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import type { DocumentView, ImageView } from "@/lib/types/media";
import { formatBytes } from "@/lib/utils";
import { deleteMediaAsset, deleteUnusedMediaAssets, updateMediaAlt } from "@/server/actions/admin/media";

type Item = {
  id: string;
  kind: "image" | "document";
  originalName: string;
  bytes: number;
  width: number | null;
  height: number | null;
  altEn: string;
  altAr: string;
  createdAt: string;
  usage: number;
  image: ImageView | null;
  document: DocumentView | null;
};

export function MediaLibrary({ items }: { items: Item[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [editing, setEditing] = useState<Item | null>(null);
  const [alt, setAlt] = useState({ altEn: "", altAr: "" });
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [cleanup, setCleanup] = useState(false);
  const unused = items.filter((i) => i.usage === 0).length;

  return (
    <FormSection
      title="Media library"
      description="Files in use can't be deleted; remove them from where they're used first."
      aside={
        unused > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setCleanup(true)}>
            <Trash2 /> Delete {unused} unused
          </Button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-subtle">Nothing uploaded yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="grid content-start gap-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-2">
                {item.image ? (
                  <img
                    src={item.image.src}
                    srcSet={item.image.srcSet}
                    sizes="200px"
                    alt={item.altEn}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <a
                    href={item.document?.url}
                    target="_blank"
                    rel="noopener"
                    className="flex h-full items-center justify-center text-subtle hover:text-fg"
                  >
                    <FileText className="size-8" />
                  </a>
                )}
                <Badge tone={item.usage ? "success" : "neutral"} className="absolute start-1.5 top-1.5">
                  {item.usage ? `Used ${item.usage}×` : "Unused"}
                </Badge>
              </div>
              <div className="grid gap-0.5 text-xs">
                <span className="truncate font-medium" title={item.originalName}>
                  {item.originalName || "Untitled"}
                </span>
                <span className="text-subtle">
                  {item.width ? `${item.width}×${item.height} · ` : ""}
                  {formatBytes(item.bytes)}
                </span>
                {item.kind === "image" && !item.altEn ? (
                  <span className="text-warning">No alt text</span>
                ) : null}
              </div>
              <div className="flex gap-1">
                {item.kind === "image" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(item);
                      setAlt({ altEn: item.altEn, altAr: item.altAr });
                    }}
                  >
                    Alt text
                  </Button>
                ) : null}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Delete ${item.originalName}`}
                  disabled={item.usage > 0}
                  title={item.usage > 0 ? "In use" : "Delete"}
                  onClick={() => setDeleting(item)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Alt text" description="Describe the image for people using screen readers.">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing)
                run(
                  () => updateMediaAlt({ id: editing.id, ...alt }),
                  () => {
                    setEditing(null);
                    router.refresh();
                  },
                );
            }}
          >
            <div className="grid gap-1.5">
              <label htmlFor="alt-en" className="text-sm font-medium">
                English
              </label>
              <Input
                id="alt-en"
                value={alt.altEn}
                onChange={(e) => setAlt((a) => ({ ...a, altEn: e.target.value }))}
                maxLength={300}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="alt-ar" className="text-sm font-medium">
                Arabic (optional)
              </label>
              <Input
                id="alt-ar"
                value={alt.altAr}
                onChange={(e) => setAlt((a) => ({ ...a, altAr: e.target.value }))}
                maxLength={300}
                dir="rtl"
                lang="ar"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                Save alt text
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this file?"
        description="It's removed from storage permanently."
        confirmLabel="Delete file"
        onConfirm={() =>
          deleting &&
          run(
            () => deleteMediaAsset(deleting.id),
            () => router.refresh(),
          )
        }
      />
      <ConfirmDialog
        open={cleanup}
        onOpenChange={setCleanup}
        title={`Delete ${unused} unused ${unused === 1 ? "file" : "files"}?`}
        description="Files that aren't used anywhere on the site are removed from storage permanently."
        confirmLabel="Delete unused files"
        onConfirm={() =>
          run(
            () => deleteUnusedMediaAssets(),
            () => router.refresh(),
          )
        }
      />
    </FormSection>
  );
}
