import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentSession, type ValidSession } from "@/server/auth/session";
import { isSameOrigin } from "@/server/security/request";

/**
 * For admin pages and layouts: returns the session or redirects to the login page.
 */
export async function requireAdmin(): Promise<ValidSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * For every admin Server Action and admin Route Handler. Verifies, on the
 * server and on every call:
 *  1. the request comes from this site (CSRF defence in depth, on top of
 *     SameSite cookies and Next.js' own Server Action origin check), and
 *  2. a valid admin session exists.
 * Redirects to the login page when the session is missing or expired.
 */
export async function authorizeAdmin(): Promise<ValidSession> {
  const h = await headers();
  if (!isSameOrigin(h)) {
    throw new Error("Cross-origin request rejected.");
  }
  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");
  return session;
}
