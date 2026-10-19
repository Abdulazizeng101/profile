import { CheckCircle2, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { getOverview } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const data = await getOverview();
  const remaining = data.checklist.filter((c) => !c.done);

  const stats = [
    {
      label: "Projects",
      value: `${data.counts.projects.published} / ${data.counts.projects.total}`,
      note: "published",
      href: "/admin/projects",
    },
    {
      label: "Experience",
      value: `${data.counts.experience.published} / ${data.counts.experience.total}`,
      note: "published",
      href: "/admin/experience",
    },
    {
      label: "Education",
      value: `${data.counts.education.published} / ${data.counts.education.total}`,
      note: "published",
      href: "/admin/education",
    },
    { label: "Skills", value: String(data.counts.skills), note: "added", href: "/admin/skills" },
    { label: "Messages", value: String(data.counts.unread), note: "unread", href: "/admin/messages" },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="What's on your site right now, and what's left to set up. Changes you save appear on the public site within seconds."
      />

      <div className="grid gap-8">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="panel grid gap-1 p-4 transition-colors hover:border-border-strong"
            >
              <dt className="text-xs text-subtle">{stat.label}</dt>
              <dd className="heading tabular text-2xl">{stat.value}</dd>
              <dd className="text-xs text-subtle">{stat.note}</dd>
            </Link>
          ))}
        </dl>

        <section className="panel grid gap-4 p-5 md:p-6" aria-labelledby="setup-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="setup-title" className="text-base font-semibold">
              Setup checklist
            </h2>
            <p className="text-sm text-subtle">
              {remaining.length === 0
                ? "All done."
                : `${data.checklist.length - remaining.length} of ${data.checklist.length} done`}
            </p>
          </div>
          <ul className="grid gap-1 md:grid-cols-2">
            {data.checklist.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm hover:bg-surface-2"
                >
                  {item.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Done" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-subtle" aria-label="To do" />
                  )}
                  <span className={item.done ? "text-subtle line-through decoration-border-strong" : ""}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="panel grid content-start gap-3 p-5 md:p-6" aria-labelledby="messages-title">
            <div className="flex items-baseline justify-between">
              <h2 id="messages-title" className="text-base font-semibold">
                Recent messages
              </h2>
              <Link href="/admin/messages" className="link text-sm">
                Open inbox
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="text-sm text-subtle">
                No messages yet. They’ll appear here when someone uses your contact form.
              </p>
            ) : (
              <ul className="grid divide-y divide-border">
                {data.recent.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/messages/${m.id}`} className="grid gap-0.5 py-2.5 hover:text-fg">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {m.status === "new" ? (
                          <span className="size-1.5 rounded-full bg-accent" aria-label="Unread" />
                        ) : null}
                        {m.name}
                        <span className="ms-auto text-xs font-normal text-subtle">
                          {m.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className="truncate text-sm text-muted">{m.subject || m.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel grid content-start gap-3 p-5 md:p-6" aria-labelledby="arabic-title">
            <h2 id="arabic-title" className="text-base font-semibold">
              Missing Arabic content
            </h2>
            {!data.arabicEnabled ? (
              <p className="text-sm text-subtle">
                The Arabic site is turned off. Turn it on in{" "}
                <Link href="/admin/languages" className="link">
                  Languages
                </Link>
                .
              </p>
            ) : data.missingArabic.length === 0 ? (
              <p className="text-sm text-subtle">Everything published has an Arabic version.</p>
            ) : (
              <>
                <p className="text-sm text-subtle">
                  These published items show English text on the Arabic site until you add a translation.
                </p>
                <ul className="grid gap-1">
                  {data.missingArabic.slice(0, 8).map((item) => (
                    <li key={item.href + item.label}>
                      <Link href={item.href} className="link text-sm">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
