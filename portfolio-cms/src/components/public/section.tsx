import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Page section with the heading in a narrow leading column, like the labels
 * column of a specification sheet. Collapses to a stacked layout on mobile.
 */
export function Section({
  id,
  title,
  meta,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("border-t border-border", className)}>
      <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
          <h2 id={`${id}-title`} className="heading text-2xl text-balance">
            {title}
          </h2>
          {meta ? <div className="mt-2 text-sm text-subtle">{meta}</div> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
