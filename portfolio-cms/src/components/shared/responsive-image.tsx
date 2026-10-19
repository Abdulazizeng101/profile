import type { CSSProperties } from "react";

import type { ImageView } from "@/lib/types/media";
import { cn } from "@/lib/utils";

/**
 * Renders a pre-processed upload with srcset/sizes so browsers download only
 * the rendition they need. Width/height prevent layout shift; the tiny blurred
 * placeholder shows until the image arrives.
 */
export function ResponsiveImage({
  image,
  sizes,
  alt,
  priority = false,
  className,
  style,
}: {
  image: ImageView;
  sizes: string;
  alt?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt ?? image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("bg-surface-2 bg-cover bg-center", className)}
      style={{ backgroundImage: image.blurDataUrl ? `url(${image.blurDataUrl})` : undefined, ...style }}
    />
  );
}
