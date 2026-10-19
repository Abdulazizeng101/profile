import "server-only";

/**
 * Typed access to environment variables. Values are read lazily so that a
 * missing optional variable never breaks the build; required ones throw a
 * clear error the first time they are needed.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return value;
}

function optional(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function siteUrl(): string {
  const raw =
    optional("SITE_URL") ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function appSecret(): string {
  const secret = required("APP_SECRET");
  if (secret.length < 32) throw new Error("APP_SECRET must be at least 32 characters long.");
  return secret;
}

export function maxUploadBytes(): number {
  const mb = Number(optional("MAX_UPLOAD_MB") || 4);
  return Math.max(1, Math.min(Number.isFinite(mb) ? mb : 4, 50)) * 1024 * 1024;
}

export type StorageConfig =
  | { driver: "local"; dir: string }
  | {
      driver: "s3";
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      publicUrl: string;
    };

export function storageConfig(): StorageConfig {
  const driver = optional("STORAGE_DRIVER") || "local";
  if (driver === "s3") {
    return {
      driver: "s3",
      endpoint: optional("S3_ENDPOINT"),
      region: optional("S3_REGION") || "auto",
      bucket: required("S3_BUCKET"),
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      publicUrl: required("S3_PUBLIC_URL").replace(/\/+$/, ""),
    };
  }
  if (driver !== "local") throw new Error(`Unknown STORAGE_DRIVER "${driver}". Use "local" or "s3".`);
  return { driver: "local", dir: optional("LOCAL_STORAGE_DIR") || "./storage" };
}

export function smtpConfig() {
  const host = optional("SMTP_HOST");
  const to = optional("CONTACT_NOTIFY_TO");
  if (!host || !to) return null;
  return {
    host,
    port: Number(optional("SMTP_PORT") || 587),
    user: optional("SMTP_USER"),
    pass: optional("SMTP_PASS"),
    from: optional("SMTP_FROM") || optional("SMTP_USER"),
    to,
  };
}

export function turnstileConfig() {
  const siteKey = optional("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const secretKey = optional("TURNSTILE_SECRET_KEY");
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

export function trustedIpHeader(): string {
  return (optional("TRUSTED_IP_HEADER") || "x-forwarded-for").toLowerCase();
}

export const isProduction = process.env.NODE_ENV === "production";
