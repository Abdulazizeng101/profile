"use client";

import { Eye } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Sticky action bar at the bottom of editors. For publishable entries it
 * offers "Save draft" and "Save and publish"; otherwise a single Save.
 */
export function SaveBar({
  dirty,
  pending,
  onSave,
  publishable,
  status,
  onSaveAs,
  previewPath,
  extra,
}: {
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  publishable?: boolean;
  status?: "draft" | "published";
  onSaveAs?: (status: "draft" | "published") => void;
  previewPath?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] backdrop-blur-md lg:start-60">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 md:px-8">
        <p className="me-auto text-sm text-subtle" aria-live="polite">
          {pending
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : status
                ? status === "published"
                  ? "Published"
                  : "Draft"
                : "All changes saved"}
        </p>
        {extra}
        {previewPath ? (
          dirty ? (
            <Button variant="ghost" disabled title="Save first, then preview">
              <Eye /> Preview
            </Button>
          ) : (
            <Button asChild variant="ghost" title="Open on the public site with drafts visible">
              <a
                href={`/api/admin/preview?path=${encodeURIComponent(previewPath)}`}
                target="_blank"
                rel="noopener"
              >
                <Eye /> Preview
              </a>
            </Button>
          )
        ) : null}
        {publishable && onSaveAs ? (
          status === "published" ? (
            <>
              <Button variant="secondary" disabled={pending} onClick={() => onSaveAs("draft")}>
                Unpublish
              </Button>
              <Button variant="primary" disabled={pending} onClick={() => onSaveAs("published")}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled={pending} onClick={() => onSaveAs("draft")}>
                Save draft
              </Button>
              <Button variant="primary" disabled={pending} onClick={() => onSaveAs("published")}>
                Save and publish
              </Button>
            </>
          )
        ) : (
          <Button variant="primary" type="button" disabled={pending || !dirty} onClick={onSave}>
            Save changes
          </Button>
        )}
      </div>
    </div>
  );
}
