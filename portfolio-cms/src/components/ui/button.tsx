import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow] duration-150",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-[color-mix(in_oklab,var(--accent)_88%,var(--fg))]",
        secondary:
          "border border-border-strong bg-surface text-fg hover:border-[var(--muted)] hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-2 hover:text-fg",
        quiet: "text-fg underline decoration-accent-line underline-offset-[0.25em] hover:decoration-accent",
        danger:
          "border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-danger-soft text-danger hover:bg-[color-mix(in_oklab,var(--danger)_18%,transparent)]",
      },
      size: {
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 rounded-[var(--radius)] px-4 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-[var(--radius)] px-5 text-sm [&_svg]:size-4",
        icon: "size-9 rounded-[var(--radius)] [&_svg]:size-4",
        "icon-sm": "size-8 rounded-[var(--radius-sm)] [&_svg]:size-3.5",
      },
    },
    compoundVariants: [{ variant: "quiet", className: "h-auto px-0" }],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
