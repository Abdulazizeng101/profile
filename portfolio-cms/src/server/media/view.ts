import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type { ImageView, DocumentView } from "@/lib/types/media";
import type { mediaAssets } from "@/server/db/schema";
import { storage } from "@/server/storage";

type Asset = typeof mediaAssets.$inferSelect;

/** Serializable image description used by the <ResponsiveImage> component. */
export function imageView(asset: Asset | null | undefined, locale: Locale): ImageView | null {
  if (!asset || asset.kind !== "image") return null;
  const store = storage();
  const variants = asset.variants.length
    ? asset.variants
    : [{ width: asset.width ?? 0, height: asset.height ?? 0, key: asset.storageKey, bytes: asset.bytes }];
  const alt = (locale === "ar" ? asset.altAr : asset.altEn) || asset.altEn || asset.altAr;
  return {
    id: asset.id,
    src: store.publicUrl(variants[variants.length - 1]!.key),
    srcSet: variants.map((v) => `${store.publicUrl(v.key)} ${v.width}w`).join(", "),
    width: asset.width ?? variants[variants.length - 1]!.width,
    height: asset.height ?? variants[variants.length - 1]!.height,
    blurDataUrl: asset.blurDataUrl,
    alt,
  };
}

export function documentView(asset: Asset | null | undefined): DocumentView | null {
  if (!asset || asset.kind !== "document") return null;
  return {
    id: asset.id,
    url: storage().publicUrl(asset.storageKey),
    name: asset.originalName,
    bytes: asset.bytes,
  };
}
