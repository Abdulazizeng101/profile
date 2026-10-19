import { LocalStorageDriver } from "../../src/server/storage/local";
import { S3StorageDriver } from "../../src/server/storage/s3";
import type { StorageDriver } from "../../src/server/storage/types";

/**
 * The storage driver configured in the environment, built without the
 * app's `server-only` env module so command-line scripts can use it.
 */
export function storageFromEnv(): StorageDriver {
  const env = (name: string) => process.env[name]?.trim() ?? "";
  const driver = env("STORAGE_DRIVER") || "local";
  if (driver === "local") return new LocalStorageDriver(env("LOCAL_STORAGE_DIR") || "./storage");
  if (driver !== "s3") throw new Error(`Unknown STORAGE_DRIVER "${driver}". Use "local" or "s3".`);

  const missing = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"].filter(
    (name) => !env(name),
  );
  if (missing.length) throw new Error(`Missing ${missing.join(", ")} for STORAGE_DRIVER=s3.`);
  return new S3StorageDriver({
    endpoint: env("S3_ENDPOINT"),
    region: env("S3_REGION") || "auto",
    bucket: env("S3_BUCKET"),
    accessKeyId: env("S3_ACCESS_KEY_ID"),
    secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
    publicUrl: env("S3_PUBLIC_URL").replace(/\/+$/, ""),
  });
}

type AssetRow = { kind: string; storageKey: string; variants?: { key: string }[] | null };

/** Every storage key an asset row points at (all image renditions, or the PDF). */
export function keysForAsset(asset: AssetRow): string[] {
  const keys = new Set<string>([asset.storageKey]);
  for (const variant of asset.variants ?? []) keys.add(variant.key);
  return [...keys];
}

export function contentTypeForKey(key: string): string {
  return key.endsWith(".pdf") ? "application/pdf" : "image/webp";
}

/** Same header the upload path sets, so a restored PDF opens with its original name. */
export function documentDisposition(originalName: string): string {
  const name = originalName || "document.pdf";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
