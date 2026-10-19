"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { authorizeAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import { contactMessages } from "@/server/db/schema";

export async function setMessageStatus(
  messageId: string,
  status: "new" | "read" | "archived",
): Promise<ActionResult> {
  await authorizeAdmin();
  if (!z.uuid().safeParse(messageId).success || !["new", "read", "archived"].includes(status)) {
    return fail("Invalid message.");
  }
  await db
    .update(contactMessages)
    .set({ status, readAt: status === "new" ? null : new Date() })
    .where(eq(contactMessages.id, messageId));
  return ok(
    status === "archived" ? "Message archived." : status === "new" ? "Marked as unread." : "Marked as read.",
  );
}

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  await authorizeAdmin();
  if (!z.uuid().safeParse(messageId).success) return fail("Invalid message.");
  await db.delete(contactMessages).where(eq(contactMessages.id, messageId));
  return ok("Message deleted.");
}
