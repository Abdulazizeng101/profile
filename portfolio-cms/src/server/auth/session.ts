import "server-only";

import { and, eq, gt, lt, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { db } from "@/server/db";
import { adminUsers, sessions } from "@/server/db/schema";
import { isProduction } from "@/server/env";
import { randomToken, sha256Hex } from "@/server/security/crypto";

export const SESSION_COOKIE = isProduction ? "__Host-portfolio_session" : "portfolio_session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // sliding window
const SESSION_REFRESH_MS = 3 * 24 * 60 * 60 * 1000; // extend when less than this remains
const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000; // hard limit since sign-in

export type SessionUser = { id: string; email: string; displayName: string };
export type ValidSession = { sessionId: string; user: SessionUser; expiresAt: Date };

/** Creates a session and returns the raw token (stored only in the cookie). */
export async function createSession(
  userId: string,
  meta: { userAgent: string; ipHash: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: sha256Hex(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent.slice(0, 300),
    ipHash: meta.ipHash,
  });
  return { token, expiresAt };
}

/** Validates a raw token, sliding the expiry forward when appropriate. */
export async function validateSessionToken(token: string): Promise<ValidSession | null> {
  if (!token || token.length > 100) return null;
  const sessionId = sha256Hex(token);
  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
      userId: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      passwordChangedAt: adminUsers.passwordChangedAt,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(adminUsers.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return null;
  const now = Date.now();
  if (row.expiresAt.getTime() <= now || row.createdAt.getTime() + SESSION_ABSOLUTE_MS <= now) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  let expiresAt = row.expiresAt;
  if (expiresAt.getTime() - now < SESSION_REFRESH_MS) {
    expiresAt = new Date(Math.min(now + SESSION_TTL_MS, row.createdAt.getTime() + SESSION_ABSOLUTE_MS));
    await db.update(sessions).set({ expiresAt, lastSeenAt: new Date() }).where(eq(sessions.id, sessionId));
  }

  return {
    sessionId,
    expiresAt,
    user: { id: row.userId, email: row.email, displayName: row.displayName },
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateOtherSessions(userId: string, keepSessionId: string): Promise<void> {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)));
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function listSessions(userId: string) {
  return db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())));
}

export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/* ----------------------------- cookie helpers ----------------------------- */

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * The current admin session for this request, or null. Memoised per request,
 * so layouts, pages and actions can all call it without extra queries.
 */
export const getCurrentSession = cache(async (): Promise<ValidSession | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

export async function requestMeta() {
  const h = await headers();
  return { userAgent: h.get("user-agent") ?? "" };
}
