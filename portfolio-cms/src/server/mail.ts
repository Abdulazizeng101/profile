import "server-only";

import nodemailer from "nodemailer";

import { siteUrl, smtpConfig } from "@/server/env";

/** Sends a short notification for a new contact message, if SMTP is configured. */
export async function notifyNewMessage(message: {
  id: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}): Promise<void> {
  const config = smtpConfig();
  if (!config) return;

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });

  const clean = (value: string) => value.replace(/[\r\n]+/g, " ").slice(0, 200);
  const lines = [
    `From: ${message.name} <${message.email}>`,
    message.company ? `Company: ${message.company}` : "",
    message.subject ? `Subject: ${message.subject}` : "",
    "",
    message.message,
    "",
    `Open in dashboard: ${siteUrl()}/admin/messages/${message.id}`,
  ].filter((line, index) => line !== "" || index > 2);

  await transport.sendMail({
    from: config.from,
    to: config.to,
    replyTo: { name: clean(message.name), address: message.email },
    subject: `Portfolio message: ${clean(message.subject || message.name)}`,
    text: lines.join("\n"),
  });
}
