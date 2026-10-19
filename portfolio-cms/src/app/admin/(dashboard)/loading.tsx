/** Shown instantly while a dashboard page loads its data. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid gap-6">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-3">
        <div className="h-7 w-48 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
      </div>
      <div className="h-48 animate-pulse rounded-[var(--radius-lg)] border border-border bg-surface" />
      <div className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-border bg-surface" />
    </div>
  );
}
