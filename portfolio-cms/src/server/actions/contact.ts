"use server";

import { headers } from "next/headers";
import { after } from "next/server";

import { contactMessageSchema } from "@/lib/validation/public";
import { db } from "@/server/db";
import { contactMessages } from "@/server/db/schema";
import { appSecret, turnstileConfig } from "@/server/env";
import { notifyNewMessage } from "@/server/mail";
import { signValue, verifySignedValue } from "@/server/security/crypto";
import { hitRateLimit } from "@/server/security/rate-limit";
import { clientIp, hashIp } from "@/server/security/request";

export type ContactResult =
  | { ok: true }
  | {
      ok: false;
      error: "generic" | "rate_limited" | "spam" | "disabled";
      fieldErrors?: Partial<Record<"name" | "email" | "message" | "company" | "subject", string>>;
    };

const MIN_FILL_MS = 3_000; // humans don't fill in a form in under 3 seconds
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * Issued when a visitor starts typing. The submission must carry it, signed,
 * and arrive at least a few seconds later. The page itself is static, so the
 * token can't be embedded at render time.
 */
export async function getContactToken(): Promise<string> {
  return signValue(appSecret(), `contact:${Date.now()}`);
}

function tokenAge(token: unknown): number | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const payload = verifySignedValue(appSecret(), token);
  const issued = payload?.startsWith("contact:") ? Number(payload.slice(8)) : NaN;
  return Number.isFinite(issued) ? Date.now() - issued : null;
}

async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const config = turnstileConfig();
  if (!config) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: config.secretKey, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

export async function sendContactMessage(input: {
  name: string;
  email: string;
  company?: string;
  subject?: string;
  message: string;
  locale?: string;
  website?: string; // honeypot
  token?: string;
  turnstileToken?: string;
}): Promise<ContactResult> {
  try {
    const settings = await db.query.siteSettings.findFirst({ columns: { contactFormEnabled: true } });
    if (settings && !settings.contactFormEnabled) return { ok: false, error: "disabled" };

    // Bots fill hidden fields: pretend success so they learn nothing.
    if (input.website) return { ok: true };

    const age = tokenAge(input.token);
    if (age === null || age < MIN_FILL_MS || age > MAX_TOKEN_AGE_MS) return { ok: false, error: "spam" };

    const h = await headers();
    const ip = clientIp(h);
    const ipHash = hashIp(ip);

    const [perIp, global] = await Promise.all([
      hitRateLimit(`contact:ip:${ipHash}`, 5, 60 * 60),
      hitRateLimit("contact:global", 60, 60 * 60),
    ]);
    if (!perIp.allowed || !global.allowed) return { ok: false, error: "rate_limited" };

    if (!(await verifyTurnstile(input.turnstileToken, ip))) return { ok: false, error: "spam" };

    const parsed = contactMessageSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: NonNullable<Extract<ContactResult, { ok: false }>["fieldErrors"]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof fieldErrors;
        fieldErrors[key] ??= issue.message;
      }
      return { ok: false, error: "generic", fieldErrors };
    }

    const [saved] = await db
      .insert(contactMessages)
      .values({ ...parsed.data, ipHash })
      .returning({ id: contactMessages.id });

    // Email notification (if SMTP is configured) is sent after the response.
    after(async () => {
      try {
        await notifyNewMessage({ ...parsed.data, id: saved!.id });
      } catch (error) {
        console.error("Contact notification failed:", error instanceof Error ? error.message : error);
      }
    });

    return { ok: true };
  } catch (error) {
    console.error("Contact form error:", error instanceof Error ? error.message : error);
    return { ok: false, error: "generic" };
  }
}
