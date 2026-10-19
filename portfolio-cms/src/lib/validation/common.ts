import { z } from "zod";

export const uuid = z.uuid({ message: "Invalid reference." });
export const nullableUuid = z.union([uuid, z.null()]).default(null);

/** Single-line text, trimmed, with a maximum length. */
export const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Keep this under ${max} characters.` })
    .default("");

export const requiredLine = (max: number, label = "This field") =>
  z
    .string()
    .trim()
    .min(1, { message: `${label} is required.` })
    .max(max, { message: `Keep this under ${max} characters.` });

/** Markdown / multi-line text. */
export const markdown = (max = 20_000) =>
  z
    .string()
    .max(max, { message: `Keep this under ${max.toLocaleString("en")} characters.` })
    .transform((value) => value.replace(/\r\n/g, "\n").trim())
    .default("");

/** Empty string or an http(s) URL. */
export const optionalUrl = z
  .string()
  .trim()
  .max(500, { message: "This URL is too long." })
  .refine((value) => value === "" || isHttpUrl(value), { message: "Enter a full URL starting with https://" })
  .default("");

export const requiredUrl = z
  .string()
  .trim()
  .max(500, { message: "This URL is too long." })
  .refine(isHttpUrl, { message: "Enter a full URL starting with https://" });

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** "YYYY-MM-DD" or empty (stored as null). */
export const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || (DATE_RE.test(value) && !Number.isNaN(Date.parse(value))), {
    message: "Enter a valid date.",
  })
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null);

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: "A URL slug is required." })
  .max(80, { message: "Keep the slug under 80 characters." })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Use lowercase letters, numbers and single hyphens, e.g. my-project.",
  });

export const publishStatus = z.enum(["draft", "published"]).default("draft");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(200, { message: "This email address is too long." })
  .pipe(z.email({ message: "Enter a valid email address." }));

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Enter a valid email address.",
  })
  .default("");

export const optionalPhone = z
  .string()
  .trim()
  .max(30, { message: "This phone number is too long." })
  .refine((value) => value === "" || /^\+?[\d\s().-]{6,30}$/.test(value), {
    message: "Use digits, spaces and an optional leading +.",
  })
  .default("");

export function idList(max: number) {
  return z.array(uuid).max(max).default([]);
}

/** Today's date as YYYY-MM-DD (UTC). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
