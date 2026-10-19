import "server-only";

import { count, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import {
  accomplishments,
  education,
  experiences,
  mediaAssets,
  profile,
  projectImages,
  siteSettings,
} from "@/server/db/schema";
import { storage } from "@/server/storage";

import { processDocument, processImage, UploadRejected } from "./process";

export type MediaAsset = typeof mediaAssets.$inferSelect;

function cleanName(filename: string): string {
  return filename.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "file";
}

/** Validates, processes and stores an upload, then records it in the database. */
export async function saveUpload(input: {
  buffer: Buffer;
  filename: string;
  kind: "image" | "document";
  altEn?: string;
  altAr?: string;
}): Promise<MediaAsset> {
  const id = crypto.randomUUID();
  const store = storage();

  if (input.kind === "image") {
    const image = await processImage(input.buffer);
    const variants = image.renditions.map((r) => ({
      width: r.width,
      height: r.height,
      bytes: r.body.length,
      key: `images/${id}/w${r.width}.webp`,
    }));
    await Promise.all(
      image.renditions.map((r, i) => store.put(variants[i]!.key, r.body, { contentType: "image/webp" })),
    );
    const largest = variants[variants.length - 1]!;
    const [row] = await db
      .insert(mediaAssets)
      .values({
        id,
        kind: "image",
        storageKey: largest.key,
        originalName: cleanName(input.filename),
        mimeType: image.mimeType,
        bytes: variants.reduce((sum, v) => sum + v.bytes, 0),
        width: image.width,
        height: image.height,
        variants,
        blurDataUrl: image.blurDataUrl,
        checksum: image.checksum,
        altEn: input.altEn ?? "",
        altAr: input.altAr ?? "",
      })
      .returning();
    return row!;
  }

  const doc = await processDocument(input.buffer);
  const key = `documents/${id}.pdf`;
  const name = cleanName(input.filename).replace(/\.pdf$/i, "") + ".pdf";
  await store.put(key, doc.body, {
    contentType: doc.mimeType,
    contentDisposition: `inline; filename="${name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  const [row] = await db
    .insert(mediaAssets)
    .values({
      id,
      kind: "document",
      storageKey: key,
      originalName: name,
      mimeType: doc.mimeType,
      bytes: doc.body.length,
      variants: [],
      checksum: doc.checksum,
    })
    .returning();
  return row!;
}

/** Number of places that reference each asset. Assets in use cannot be deleted. */
export async function mediaUsage(ids?: string[]): Promise<Map<string, number>> {
  const usage = new Map<string, number>();
  const add = (rows: { id: string | null; n: number }[]) => {
    for (const row of rows) if (row.id) usage.set(row.id, (usage.get(row.id) ?? 0) + Number(row.n));
  };
  const scoped = Boolean(ids && ids.length);

  add(
    await db
      .select({ id: projectImages.mediaId, n: count() })
      .from(projectImages)
      .where(scoped ? inArray(projectImages.mediaId, ids!) : undefined)
      .groupBy(projectImages.mediaId),
  );
  const [p] = await db.select().from(profile).limit(1);
  if (p) add([p.photoId, p.cvEnId, p.cvArId].map((id) => ({ id, n: 1 })));
  const [s] = await db.select({ og: siteSettings.ogImageId }).from(siteSettings).limit(1);
  if (s) add([{ id: s.og, n: 1 }]);
  add(
    await db
      .select({ id: experiences.logoId, n: count() })
      .from(experiences)
      .where(scoped ? inArray(experiences.logoId, ids!) : undefined)
      .groupBy(experiences.logoId),
  );
  add(
    await db
      .select({ id: education.logoId, n: count() })
      .from(education)
      .where(scoped ? inArray(education.logoId, ids!) : undefined)
      .groupBy(education.logoId),
  );
  add(
    await db
      .select({ id: accomplishments.documentId, n: count() })
      .from(accomplishments)
      .where(scoped ? inArray(accomplishments.documentId, ids!) : undefined)
      .groupBy(accomplishments.documentId),
  );
  return usage;
}

export async function deleteMedia(id: string): Promise<void> {
  const usage = await mediaUsage([id]);
  if ((usage.get(id) ?? 0) > 0) {
    throw new UploadRejected("This file is still used on the site. Remove it from those places first.");
  }
  const [asset] = await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning();
  if (!asset) return;
  const keys = asset.kind === "image" ? asset.variants.map((v) => v.key) : [asset.storageKey];
  await storage().delete(keys);
}

/** Deletes every asset that nothing references. Returns how many were removed. */
export async function deleteUnusedMedia(): Promise<number> {
  const all = await db.select({ id: mediaAssets.id }).from(mediaAssets);
  const usage = await mediaUsage();
  const unused = all.filter((a) => !usage.get(a.id)).map((a) => a.id);
  for (const id of unused) await deleteMedia(id);
  return unused.length;
}

export async function getMediaByIds(ids: string[]): Promise<MediaAsset[]> {
  if (ids.length === 0) return [];
  return db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids));
}
