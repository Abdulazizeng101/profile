"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

import { ResponsiveImage } from "@/components/shared/responsive-image";
import type { LocalText } from "@/lib/types/content";
import type { ImageView } from "@/lib/types/media";

type Shot = { image: ImageView; caption: LocalText };

/** Screenshot grid with a keyboard-accessible lightbox. */
export function ProjectGallery({
  shots,
  pageLocale,
  labels,
}: {
  shots: Shot[];
  pageLocale: "en" | "ar";
  labels: { open: string; close: string; previous: string; next: string; counter: string };
}) {
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : shots[index];
  const rtl = pageLocale === "ar";

  const go = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + shots.length) % shots.length));

  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2">
        {shots.map((shot, i) => (
          <li key={shot.image.id} className={shots.length % 2 === 1 && i === 0 ? "sm:col-span-2" : undefined}>
            <figure className="grid gap-2">
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group block overflow-hidden rounded-[var(--radius)] border border-border bg-surface-2"
                aria-label={`${labels.open}: ${shot.caption.text || shot.image.alt || i + 1}`}
              >
                <ResponsiveImage
                  image={shot.image}
                  sizes={
                    shots.length % 2 === 1 && i === 0
                      ? "(min-width: 1200px) 760px, 100vw"
                      : "(min-width: 1200px) 370px, (min-width: 640px) 50vw, 100vw"
                  }
                  className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.015]"
                />
              </button>
              {shot.caption.text ? (
                <figcaption className="text-sm text-subtle" lang={shot.caption.lang} dir="auto">
                  {shot.caption.text}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>

      <DialogPrimitive.Root open={current !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] gap-3 p-4 text-[#ece9e2] outline-none md:p-8"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") go(rtl ? -1 : 1);
              if (event.key === "ArrowLeft") go(rtl ? 1 : -1);
            }}
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between gap-4">
              <DialogPrimitive.Title className="text-sm text-[#a3a8ae]">
                {index !== null
                  ? labels.counter.replace("{n}", String(index + 1)).replace("{total}", String(shots.length))
                  : ""}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label={labels.close}
              >
                <X className="size-5" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>
            {current ? (
              <div className="relative flex min-h-0 items-center justify-center">
                <img
                  src={current.image.src}
                  srcSet={current.image.srcSet}
                  sizes="100vw"
                  alt={current.image.alt || current.caption.text}
                  className="max-h-full max-w-full rounded-[var(--radius-sm)] object-contain"
                />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => go(-1)}
                className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
                aria-label={labels.previous}
                disabled={shots.length < 2}
              >
                <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
              </button>
              <p className="text-center text-sm text-[#a3a8ae]" lang={current?.caption.lang} dir="auto">
                {current?.caption.text}
              </p>
              <button
                type="button"
                onClick={() => go(1)}
                className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
                aria-label={labels.next}
                disabled={shots.length < 2}
              >
                <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
