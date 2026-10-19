import type { z } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  { ok: true; message?: string; data?: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

export const initialActionState: ActionResult<never> | null = null;

export function ok<T = undefined>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Converts a Zod error into field errors keyed by dotted path ("translations.en.title"). */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function validationFailed(error: z.ZodError): ActionResult<never> {
  const count = error.issues.length;
  return fail(
    count === 1 ? "One field needs attention." : `${count} fields need attention.`,
    zodFieldErrors(error),
  );
}
