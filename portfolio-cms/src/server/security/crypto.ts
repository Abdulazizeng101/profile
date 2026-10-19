import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmacHex(secret: string, input: string): string {
  return createHmac("sha256", secret).update(input).digest("hex");
}

/** URL-safe random token with the given number of bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Signs a short payload: "<payload>.<hmac>". Used for the contact form's
 * render timestamp so bots cannot forge a "filled in slowly" token.
 */
export function signValue(secret: string, payload: string): string {
  return `${payload}.${hmacHex(secret, payload)}`;
}

export function verifySignedValue(secret: string, signed: string): string | null {
  const index = signed.lastIndexOf(".");
  if (index <= 0) return null;
  const payload = signed.slice(0, index);
  const signature = signed.slice(index + 1);
  return safeEqual(signature, hmacHex(secret, payload)) ? payload : null;
}
