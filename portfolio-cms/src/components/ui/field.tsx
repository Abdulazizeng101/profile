import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const control = [
  "w-full rounded-[var(--radius)] border border-border-strong bg-bg px-3 text-sm text-fg",
  "placeholder:text-subtle transition-[border-color,box-shadow] duration-150",
  "hover:border-[var(--muted)] focus-visible:border-accent focus-visible:outline-none",
  "focus-visible:ring-3 focus-visible:ring-accent-soft",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger-soft",
].join(" ");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        control,
        "h-10 appearance-none bg-[length:12px] bg-[position:right_0.75rem_center] bg-no-repeat pe-9 rtl:bg-[position:left_0.75rem_center]",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23868c93%22 stroke-width=%221.5%22><path d=%22M3 4.5 6 7.5 9 4.5%22/></svg>')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-fg", className)} {...props} />;
}

/** Label + control + hint + error, with ids wired for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | string[];
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-subtle" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !message ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** aria props to put on a control rendered inside <Field>. */
export function fieldAria(id: string, error?: string | string[], hint?: boolean) {
  const hasError = Boolean(Array.isArray(error) ? error.length : error);
  return {
    id,
    "aria-invalid": hasError || undefined,
    "aria-describedby": hasError ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}
