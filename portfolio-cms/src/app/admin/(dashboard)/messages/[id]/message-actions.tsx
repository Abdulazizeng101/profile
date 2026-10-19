"use client";

import { Archive, ArchiveRestore, Mail, MailOpen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAction } from "@/components/admin/use-entity-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { deleteMessage, setMessageStatus } from "@/server/actions/admin/messages";

export function MessageActions({
  id,
  status,
  mailto,
}: {
  id: string;
  status: "new" | "read" | "archived";
  mailto: string;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <Button asChild variant="primary" size="sm">
        <a href={mailto}>
          <Mail /> Reply by email
        </a>
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          run(
            () => setMessageStatus(id, "new"),
            () => router.push("/admin/messages"),
          )
        }
      >
        <MailOpen /> Mark unread
      </Button>
      {status === "archived" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () => setMessageStatus(id, "read"),
              () => router.refresh(),
            )
          }
        >
          <ArchiveRestore /> Move to inbox
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () => setMessageStatus(id, "archived"),
              () => router.push("/admin/messages"),
            )
          }
        >
          <Archive /> Archive
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} aria-label="Delete message">
        <Trash2 />
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this message?"
        description="It's removed permanently."
        confirmLabel="Delete message"
        onConfirm={() =>
          run(
            () => deleteMessage(id),
            () => router.push("/admin/messages"),
          )
        }
      />
    </>
  );
}
