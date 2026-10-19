import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-surface-2 text-muted",
        accent: "border-accent-line bg-accent-soft text-fg",
        success: "border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-success-soft text-success",
        warning: "border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-warning-soft text-warning",
        danger: "border-[color-mix(in_oklab,var(--danger)_35%,transparent)] bg-danger-soft text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
