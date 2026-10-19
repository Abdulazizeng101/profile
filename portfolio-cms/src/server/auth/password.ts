import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with the OWASP-recommended baseline (19 MiB memory, 2 iterations,
 * 1 lane). Parameters are embedded in each hash, so they can be raised later
 * without invalidating existing passwords.
 */
const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Returns a human-readable problem with the password, or null if acceptable. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (new Set(password).size < 5) {
    return "Use a less repetitive password.";
  }
  if (email && password.toLowerCase().includes(email.split("@")[0]!.toLowerCase())) {
    return "Don't include your email name in the password.";
  }
  return null;
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifies against a real Argon2id hash of a random string. Used when the
 * email is unknown so that login takes the same time for existing and
 * non-existing accounts.
 */
export async function burnPasswordCheck(password: string): Promise<false> {
  dummyHash ??= hash(crypto.randomUUID(), ARGON2_OPTIONS);
  await verifyPassword(await dummyHash, password);
  return false;
}
