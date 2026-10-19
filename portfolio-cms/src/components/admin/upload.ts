"use client";

import type { DocumentView, ImageView } from "@/lib/types/media";

export type UploadResult = {
  id: string;
  kind: "image" | "document";
  image: ImageView | null;
  document: DocumentView | null;
};

export const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp";
export const ACCEPT_PDF = "application/pdf";
const MAX_DIMENSION = 2560;
const RESIZE_ABOVE_BYTES = 3 * 1024 * 1024;

/**
 * Large photos (e.g. straight from a phone) are scaled down in the browser
 * first, so uploads stay small and fit the host's request size limit. The
 * server re-encodes everything anyway.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Let the server report unreadable files.
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= RESIZE_ABOVE_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
  const output =
    blob?.type === "image/webp"
      ? blob
      : await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  if (!output) return file;
  const ext = output.type === "image/webp" ? "webp" : "jpg";
  return new File([output], file.name.replace(/\.[^.]+$/, "") + `.${ext}`, { type: output.type });
}

export async function uploadFile(
  file: File,
  kind: "image" | "document",
  alt: { altEn?: string; altAr?: string } = {},
): Promise<UploadResult> {
  const body = new FormData();
  body.set("file", kind === "image" ? await prepareImage(file) : file);
  body.set("kind", kind);
  if (alt.altEn) body.set("altEn", alt.altEn);
  if (alt.altAr) body.set("altAr", alt.altAr);

  let response: Response;
  try {
    response = await fetch("/api/admin/upload", { method: "POST", body, credentials: "same-origin" });
  } catch {
    throw new Error("The upload didn't reach the server. Check your connection and try again.");
  }
  const data = (await response.json().catch(() => null)) as (UploadResult & { error?: string }) | null;
  if (!response.ok || !data || data.error) {
    throw new Error(data?.error ?? `The upload failed (${response.status}).`);
  }
  return data;
}
