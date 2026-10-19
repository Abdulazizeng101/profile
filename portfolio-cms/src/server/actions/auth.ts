"use server";

import { eq, sql } from "drizzle-orm";
import { draftMode, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { loginSchema } from "@/lib/validation/public";
import { authorizeAdmin } from "@/server/auth/guard";
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import {
  createSession,
  deleteSessionCookie,
  getCurrentSession,
  invalidateOtherSessions,
  invalidateSession,
  pruneExpiredSessions,
  setSessionCookie,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { adminUsers } from "@/server/db/schema";
import { hitRateLimit, peekRateLimit, pruneRateLimits, resetRateLimit } from "@/server/security/rate-limit";
import { clientIp, hashIp, isSameOrigin } from "@/server/security/request";

const LOGIN_WINDOW = 15 * 60; // seconds
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 20;
const GENERIC_ERROR = "That email and password don't match an admin account.";

export type LoginState = { error?: string } | null;

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  if (!isSameOrigin(h)) return { error: "This sign-in request was blocked. Reload the page and try again." };

  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };
  const { email, password } = parsed.data;

  const ipHash = hashIp(clientIp(h));
  const emailKey = `login:email:${email}`;

  const perIp = await hitRateLimit(`login:ip:${ipHash}`, MAX_ATTEMPTS_PER_IP, LOGIN_WINDOW);
  const emailFailures = await peekRateLimit(emailKey, LOGIN_WINDOW);
  if (!perIp.allowed || emailFailures >= MAX_FAILURES_PER_EMAIL) {
    const minutes = Math.max(1, Math.ceil((perIp.allowed ? LOGIN_WINDOW : perIp.retryAfterSeconds) / 60));
    return { error: `Too many sign-in attempts. Try again in about ${minutes} minutes.` };
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${email}`)
    .limit(1);

  const valid = user ? await verifyPassword(user.passwordHash, password) : await burnPasswordCheck(password);
  if (!user || !valid) {
    await hitRateLimit(emailKey, MAX_FAILURES_PER_EMAIL, LOGIN_WINDOW);
    return { error: GENERIC_ERROR };
  }

  await resetRateLimit(emailKey);
  const { token, expiresAt } = await createSession(user.id, {
    userAgent: h.get("user-agent") ?? "",
    ipHash,
  });
  await setSessionCookie(token, expiresAt);
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));

  // Opportunistic housekeeping; cheap at this scale.
  await Promise.allSettled([pruneExpiredSessions(), pruneRateLimits()]);

  redirect("/admin");
}

export async function logout(): Promise<void> {
  const session = await getCurrentSession();
  if (session) await invalidateSession(session.sessionId);
  await deleteSessionCookie();
  (await draftMode()).disable();
  redirect("/admin/login");
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Enter your current password." }),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The new passwords don't match.",
  });

export async function changePassword(input: z.input<typeof passwordSchema>): Promise<ActionResult> {
  const session = await authorizeAdmin();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", {
      [parsed.error.issues[0]!.path.join(".")]: [parsed.error.issues[0]!.message],
    });
  }
  const problem = passwordProblem(parsed.data.newPassword, session.user.email);
  if (problem) return fail(problem, { newPassword: [problem] });

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.user.id));
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return fail("Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date() })
    .where(eq(adminUsers.id, user.id));
  // A password change signs out every other device.
  await invalidateOtherSessions(user.id, session.sessionId);
  return ok("Password changed. Other devices were signed out.");
}

export async function signOutOtherSessions(): Promise<ActionResult> {
  const session = await authorizeAdmin();
  await invalidateOtherSessions(session.user.id, session.sessionId);
  return ok("Signed out of all other devices.");
}

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const session = await authorizeAdmin();
  const value = z.string().trim().max(80).safeParse(name);
  if (!value.success) return fail("Keep your name under 80 characters.");
  await db.update(adminUsers).set({ displayName: value.data }).where(eq(adminUsers.id, session.user.id));
  return ok("Saved.");
}
