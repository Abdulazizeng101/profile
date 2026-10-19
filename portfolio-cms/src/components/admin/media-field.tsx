"use client";

import { useState } from "react";

import type { DocumentView, ImageView } from "@/lib/types/media";

import { DocumentUploader } from "./document-uploader";
import { ImageUploader } from "./image-uploader";

/**
 * Image field inside a larger form: uploading stores the file right away and
 * puts its id into the form; the form's own Save button links it to the entry.
 */
export function ImageField({
  label,
  description,
  value,
  initialView,
  onChange,
  aspect = "aspect-square",
  fit = "contain",
  askAlt = false,
  compact = true,
}: {
  label: string;
  description?: string;
  value: string | null | undefined;
  initialView: ImageView | null;
  onChange: (id: string | null) => void;
  aspect?: string;
  fit?: "cover" | "contain";
  askAlt?: boolean;
  compact?: boolean;
}) {
  const [view, setView] = useState<ImageView | null>(initialView);
  return (
    <ImageUploader
      label={label}
      description={description}
      current={value ? view : null}
      aspect={aspect}
      fit={fit}
      askAlt={askAlt}
      compact={compact}
      onUploaded={(result) => {
        setView(result.image);
        onChange(result.id);
      }}
      onRemove={() => onChange(null)}
    />
  );
}

export function DocumentField({
  label,
  description,
  value,
  initialView,
  onChange,
}: {
  label: string;
  description?: string;
  value: string | null | undefined;
  initialView: DocumentView | null;
  onChange: (id: string | null) => void;
}) {
  const [view, setView] = useState<DocumentView | null>(initialView);
  return (
    <DocumentUploader
      label={label}
      description={description}
      current={value ? view : null}
      onUploaded={(result) => {
        setView(result.document);
        onChange(result.id);
      }}
      onRemove={() => onChange(null)}
    />
  );
}
