import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-8 grid gap-3">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="heading text-2xl">{title}</h1>
          {description ? <p className="max-w-[68ch] text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** A titled group of fields inside a form. */
export function FormSection({
  title,
  description,
  children,
  aside,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="panel grid gap-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="max-w-[70ch] text-sm text-muted">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-[var(--radius-lg)] border border-dashed border-border-strong p-8">
      <p className="font-medium">{title}</p>
      {text ? <p className="max-w-[60ch] text-sm text-muted">{text}</p> : null}
      {action}
    </div>
  );
}
