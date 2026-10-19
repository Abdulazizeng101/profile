import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/admin/page-header";
import { getMessage, markMessageRead } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth/guard";

import { MessageActions } from "./message-actions";

export const metadata: Metadata = { title: "Message" };

export default async function MessagePage({ params }: PageProps<"/admin/messages/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  let message = await getMessage(id);
  if (!message) notFound();
  if (message.status === "new") {
    await markMessageRead(id);
    message = { ...message, status: "read" };
  }

  const subject = message.subject || "Your message";
  const mailto = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${subject}`)}`;

  return (
    <>
      <PageHeader
        title={message.subject || `Message from ${message.name}`}
        back={
          <Link href="/admin/messages" className="link w-fit text-sm text-muted">
            All messages
          </Link>
        }
        actions={<MessageActions id={message.id} status={message.status} mailto={mailto} />}
      />
      <article className="panel grid gap-5 p-6">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-subtle">From</dt>
          <dd>{message.name}</dd>
          <dt className="text-subtle">Email</dt>
          <dd>
            <a href={mailto} className="link" dir="ltr">
              {message.email}
            </a>
          </dd>
          {message.company ? (
            <>
              <dt className="text-subtle">Company</dt>
              <dd>{message.company}</dd>
            </>
          ) : null}
          <dt className="text-subtle">Received</dt>
          <dd>{message.createdAt.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}</dd>
          <dt className="text-subtle">Site language</dt>
          <dd>{message.locale === "ar" ? "Arabic" : "English"}</dd>
        </dl>
        <div
          className="border-t border-border pt-5 text-[0.95rem] leading-relaxed whitespace-pre-wrap"
          dir="auto"
        >
          {message.message}
        </div>
      </article>
    </>
  );
}
