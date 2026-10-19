import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-6">
      <div className="grid max-w-sm gap-3 text-center">
        <h1 className="heading text-2xl">Not found</h1>
        <p className="text-sm text-muted">This item doesn’t exist, or it was deleted.</p>
        <Link href="/admin" className="link text-sm">
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
