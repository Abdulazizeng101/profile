import "server-only";

import { fileTypeFromBuffer } from "file-type";
import sharp, { type Sharp } from "sharp";

import { sha256Hex } from "@/server/security/crypto";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf"] as const;

/** Widths of the responsive renditions generated for every image. */
export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920, 2560] as const;
const MAX_INPUT_PIXELS = 60_000_000; // ~ 7700 x 7700; rejects decompression bombs

export class UploadRejected extends Error {}

export type ProcessedImage = {
  kind: "image";
  mimeType: "image/webp";
  width: number;
  height: number;
  checksum: string;
  blurDataUrl: string;
  renditions: { width: number; height: number; body: Buffer }[];
};

export type ProcessedDocument = {
  kind: "document";
  mimeType: "application/pdf";
  checksum: string;
  body: Buffer;
};

/** Detects the real type from the file's bytes; the browser-supplied type is ignored. */
export async function sniffType(buffer: Buffer): Promise<string | null> {
  const detected = await fileTypeFromBuffer(buffer);
  return detected?.mime ?? null;
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const mime = await sniffType(buffer);
  if (!mime || !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime)) {
    throw new UploadRejected("Upload a JPG, PNG or WebP image.");
  }

  let base: Sharp;
  let width: number;
  let height: number;
  try {
    // rotate() applies EXIF orientation; output drops all metadata (including GPS).
    base = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .toColourspace("srgb");
    const meta = await base.metadata();
    width = meta.autoOrient?.width ?? meta.width ?? 0;
    height = meta.autoOrient?.height ?? meta.height ?? 0;
  } catch {
    throw new UploadRejected("This image couldn't be read. Try exporting it again as JPG or PNG.");
  }
  if (width < 16 || height < 16) throw new UploadRejected("This image is too small.");

  const targets: number[] = IMAGE_WIDTHS.filter((w) => w < width);
  targets.push(Math.min(width, IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]));

  const renditions = await Promise.all(
    [...new Set(targets)].map(async (target) => {
      const { data, info } = await base
        .clone()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, body: data };
    }),
  );
  renditions.sort((a, b) => a.width - b.width);

  const blur = await base.clone().resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  const largest = renditions[renditions.length - 1]!;

  return {
    kind: "image",
    mimeType: "image/webp",
    width: largest.width,
    height: largest.height,
    checksum: sha256Hex(buffer),
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    renditions,
  };
}

/**
 * Accepts PDFs only, verified by their bytes. PDFs that embed JavaScript or
 * launch actions are rejected because they will be served to visitors.
 */
export async function processDocument(buffer: Buffer): Promise<ProcessedDocument> {
  const mime = await sniffType(buffer);
  if (mime !== "application/pdf" || buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new UploadRejected("Upload a PDF file.");
  }
  const text = buffer.toString("latin1");
  if (/\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(text)) {
    throw new UploadRejected(
      "This PDF contains scripts or embedded files. Export it again (for example with “Save as PDF”) and retry.",
    );
  }
  return { kind: "document", mimeType: "application/pdf", checksum: sha256Hex(buffer), body: buffer };
}
