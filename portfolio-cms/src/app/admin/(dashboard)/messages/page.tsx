import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";
import { getMessages } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Messages" };

const FILTERS = [
  { key: "inbox", label: "Inbox" },
  { key: "new", label: "Unread" },
  { key: "archived", label: "Archived" },
] as const;

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const { view } = await searchParams;
  const current = FILTERS.find((f) => f.key === view)?.key ?? "inbox";
  const messages = await getMessages(current);

  return (
    <>
      <PageHeader
        title="Messages"
        description="Sent through the contact form on your site. Reply from your own email."
      />
      <nav aria-label="Message filters" className="mb-5 flex gap-1 border-b border-border">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "inbox" ? "/admin/messages" : `/admin/messages?view=${f.key}`}
            aria-current={current === f.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              current === f.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {messages.length === 0 ? (
        <EmptyState title={current === "archived" ? "No archived messages" : "No messages"} />
      ) : (
        <ul className="panel divide-y divide-border">
          {messages.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/messages/${m.id}`} className="grid gap-1 px-5 py-3.5 hover:bg-surface-2/60">
                <span className="flex items-center gap-2">
                  {m.status === "new" ? (
                    <span className="size-2 rounded-full bg-accent" aria-label="Unread" />
                  ) : null}
                  <span className={cn("text-sm", m.status === "new" && "font-semibold")}>{m.name}</span>
                  {m.company ? <span className="text-sm text-subtle">{m.company}</span> : null}
                  <time className="ms-auto text-xs text-subtle" dateTime={m.createdAt.toISOString()}>
                    {m.createdAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </span>
                <span className="truncate text-sm text-muted">
                  {m.subject ? <span className="text-fg">{m.subject} — </span> : null}
                  {m.message}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
