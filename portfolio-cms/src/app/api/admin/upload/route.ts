import { headers } from "next/headers";

import { getCurrentSession } from "@/server/auth/session";
import { maxUploadBytes } from "@/server/env";
import { UploadRejected } from "@/server/media/process";
import { saveUpload } from "@/server/media/service";
import { documentView, imageView } from "@/server/media/view";
import { hitRateLimit } from "@/server/security/rate-limit";
import { isSameOrigin } from "@/server/security/request";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Upload endpoint for the dashboard (multipart/form-data: file, kind, altEn, altAr).
 * Requires a same-origin request with a valid admin session. The file's real
 * type is detected from its bytes; images are re-encoded, which also strips
 * metadata such as GPS location.
 */
export async function POST(request: Request) {
  const h = await headers();
  if (!isSameOrigin(h)) return error("Cross-origin request rejected.", 403);
  const session = await getCurrentSession();
  if (!session) return error("Your session has expired. Sign in again.", 401);

  const limit = maxUploadBytes();
  const declared = Number(h.get("content-length") ?? 0);
  if (declared > limit + 64 * 1024) {
    return error(`This file is larger than ${Math.round(limit / 1024 / 1024)} MB.`, 413);
  }

  const rate = await hitRateLimit(`upload:${session.user.id}`, 120, 60 * 60);
  if (!rate.allowed) return error("Too many uploads in the last hour. Try again later.", 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("The upload couldn't be read. Try again.", 400);
  }

  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof File)) return error("Choose a file to upload.", 400);
  if (kind !== "image" && kind !== "document") return error("Unknown upload type.", 400);
  if (file.size === 0) return error("This file is empty.", 400);
  if (file.size > limit) return error(`This file is larger than ${Math.round(limit / 1024 / 1024)} MB.`, 413);

  const altEn = String(form.get("altEn") ?? "")
    .trim()
    .slice(0, 300);
  const altAr = String(form.get("altAr") ?? "")
    .trim()
    .slice(0, 300);

  try {
    const asset = await saveUpload({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      kind,
      altEn,
      altAr,
    });
    return Response.json({
      id: asset.id,
      kind: asset.kind,
      image: imageView(asset, "en"),
      document: documentView(asset),
    });
  } catch (err) {
    if (err instanceof UploadRejected) return error(err.message, 422);
    console.error("Upload failed:", err instanceof Error ? err.message : err);
    return error("The upload failed. Try again in a moment.", 500);
  }
}
