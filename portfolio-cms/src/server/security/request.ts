import "server-only";

import { appSecret, siteUrl, trustedIpHeader } from "@/server/env";
import { hmacHex } from "@/server/security/crypto";

type HeaderSource = Pick<Headers, "get">;

/** Best-effort client IP from the configured proxy header. */
export function clientIp(headers: HeaderSource): string {
  const header = trustedIpHeader();
  const raw = headers.get(header) ?? headers.get("x-real-ip") ?? "";
  // x-forwarded-for: "client, proxy1, proxy2" -> the left-most entry is the client.
  return raw.split(",")[0]?.trim() || "unknown";
}

/** IPs are never stored; only a keyed hash used for rate limiting. */
export function hashIp(ip: string): string {
  return hmacHex(appSecret(), `ip:${ip}`).slice(0, 32);
}

/**
 * Same-origin check for state-changing requests. Accepts the request when the
 * Origin header matches this site's host (or the configured SITE_URL).
 * Server Actions already get this check from Next.js; route handlers call it explicitly.
 */
export function isSameOrigin(headers: HeaderSource): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host && originHost === host) return true;
  try {
    return originHost === new URL(siteUrl()).host;
  } catch {
    return false;
  }
}
