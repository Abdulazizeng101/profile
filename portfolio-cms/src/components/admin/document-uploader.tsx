"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DocumentView } from "@/lib/types/media";
import { formatBytes } from "@/lib/utils";

import { ACCEPT_PDF, uploadFile, type UploadResult } from "./upload";

export function DocumentUploader({
  label,
  description,
  current,
  onUploaded,
  onRemove,
}: {
  label: string;
  description?: string;
  current?: DocumentView | null;
  onUploaded: (result: UploadResult) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function choose(next: File | undefined) {
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Choose a PDF file.");
      return;
    }
    setFile(next);
  }

  // Same as the image uploader: keep a file chosen before hydration finished.
  useEffect(() => {
    const early = inputRef.current?.files?.[0];
    if (early) choose(early);
    // Runs once, on mount.
  }, []);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      await onUploaded(await uploadFile(file, "document"));
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-subtle">{description}</p> : null}
      </div>

      {current ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-2.5">
          <FileText className="size-5 text-accent" />
          <a
            href={current.url}
            target="_blank"
            rel="noopener"
            className="link min-w-0 flex-1 truncate text-sm"
          >
            {current.name}
          </a>
          <span className="text-xs text-subtle">{formatBytes(current.bytes)}</span>
        </div>
      ) : (
        <p className="text-sm text-subtle">No file uploaded.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_PDF}
        className="sr-only"
        onChange={(e) => choose(e.target.files?.[0])}
        aria-label={label}
      />

      {file ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">
            {file.name} <span className="text-subtle">({formatBytes(file.size)})</span>
          </span>
          <Button variant="primary" onClick={upload} disabled={busy}>
            <Upload /> {busy ? "Uploading…" : current ? "Upload and replace" : "Upload"}
          </Button>
          <Button variant="ghost" onClick={() => setFile(null)} disabled={busy}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => inputRef.current?.click()}>
            <FileText /> {current ? "Replace PDF" : "Choose PDF"}
          </Button>
          {current && onRemove ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onRemove();
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
