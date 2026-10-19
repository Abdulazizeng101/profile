"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { expire } from "@/server/admin/helpers";
import { authorizeAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import { mediaAssets } from "@/server/db/schema";
import { UploadRejected } from "@/server/media/process";
import { deleteMedia, deleteUnusedMedia } from "@/server/media/service";

const altSchema = z.object({
  id: z.uuid(),
  altEn: z.string().trim().max(300, { message: "Keep alt text under 300 characters." }),
  altAr: z.string().trim().max(300, { message: "Keep alt text under 300 characters." }),
});

export async function updateMediaAlt(input: unknown): Promise<ActionResult> {
  await authorizeAdmin();
  const parsed = altSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input.");
  const { id, ...alt } = parsed.data;
  await db.update(mediaAssets).set(alt).where(eq(mediaAssets.id, id));
  expire();
  return ok("Alt text saved.");
}

export async function deleteMediaAsset(id: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Invalid file.");
  try {
    await deleteMedia(id);
  } catch (error) {
    if (error instanceof UploadRejected) return fail(error.message);
    throw error;
  }
  expire();
  return ok("File deleted.");
}

export async function deleteUnusedMediaAssets(): Promise<ActionResult> {
  await authorizeAdmin();
  const count = await deleteUnusedMedia();
  return ok(
    count === 0 ? "No unused files to delete." : `Deleted ${count} unused ${count === 1 ? "file" : "files"}.`,
  );
}
