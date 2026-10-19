"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { ImageView } from "@/lib/types/media";
import { cn } from "@/lib/utils";

import { ACCEPT_IMAGES, uploadFile, type UploadResult } from "./upload";

/**
 * Pick an image, check the preview, add alt text, then upload. Shows the
 * current image when there is one, with Replace and Remove actions.
 */
export function ImageUploader({
  label,
  description,
  current,
  onUploaded,
  onRemove,
  aspect = "aspect-[4/3]",
  fit = "cover",
  askAlt = true,
  compact = false,
}: {
  label: string;
  description?: string;
  current?: ImageView | null;
  onUploaded: (result: UploadResult) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  aspect?: string;
  fit?: "cover" | "contain";
  askAlt?: boolean;
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altEn, setAltEn] = useState("");
  const [altAr, setAltAr] = useState("");
  const [busy, setBusy] = useState(false);

  // Release the preview's object URL when it's replaced or the component unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(next: File | undefined) {
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  // A file picked before the page finished loading (slow connection) fires its
  // change event before React is listening. Pick it up once we are.
  useEffect(() => {
    const early = inputRef.current?.files?.[0];
    if (early) choose(early);
    // Runs once, on mount.
  }, []);

  function reset() {
    setFile(null);
    setPreview(null);
    setAltEn("");
    setAltAr("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadFile(file, "image", { altEn, altAr });
      await onUploaded(result);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? current?.src ?? null;

  return (
    <div
      className={cn(
        "grid gap-3",
        compact
          ? "sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-5"
          : "md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-6",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius)] border border-dashed border-border-strong bg-surface-2",
          aspect,
          compact ? "w-40" : "w-full",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files[0]);
        }}
      >
        {shown ? (
          <img
            src={shown}
            srcSet={!preview && current ? current.srcSet : undefined}
            sizes="240px"
            alt={preview ? "Preview of the selected image" : current?.alt || ""}
            className={cn(
              "absolute inset-0 h-full w-full",
              fit === "cover" ? "object-cover" : "object-contain p-3",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-subtle hover:text-fg"
          >
            <ImagePlus className="size-6" />
            <span>Choose or drop an image</span>
          </button>
        )}
        {preview ? (
          <span className="absolute start-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-2xs text-white">
            Not saved yet
          </span>
        ) : null}
      </div>

      <div className="grid content-start gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-medium">{label}</p>
          {description ? <p className="text-xs text-subtle">{description}</p> : null}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_IMAGES}
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
          aria-label={label}
        />

        {file ? (
          <>
            {askAlt ? (
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <label htmlFor={`${inputId}-alt-en`} className="text-xs font-medium">
                    Alt text (English)
                  </label>
                  <Input
                    id={`${inputId}-alt-en`}
                    value={altEn}
                    onChange={(e) => setAltEn(e.target.value)}
                    maxLength={300}
                    placeholder="Describe the image for people who can't see it"
                  />
                </div>
                <div className="grid gap-1">
                  <label htmlFor={`${inputId}-alt-ar`} className="text-xs font-medium">
                    Alt text (Arabic, optional)
                  </label>
                  <Input
                    id={`${inputId}-alt-ar`}
                    value={altAr}
                    onChange={(e) => setAltAr(e.target.value)}
                    maxLength={300}
                    dir="rtl"
                    lang="ar"
                  />
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={upload} disabled={busy}>
                <Upload /> {busy ? "Uploading…" : "Upload and save"}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => inputRef.current?.click()}>
              <ImagePlus /> {current ? "Replace image" : "Choose image"}
            </Button>
            {current && onRemove ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onRemove();
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                <Trash2 /> Remove
              </Button>
            ) : null}
          </div>
        )}
        <p className="text-xs text-subtle">JPG, PNG or WebP. Large photos are resized automatically.</p>
      </div>
    </div>
  );
}
