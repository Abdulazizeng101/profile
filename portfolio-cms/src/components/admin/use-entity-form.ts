"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult, FieldErrors } from "@/lib/action-result";

type Path = (string | number)[];

function setIn<T>(target: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const source = (target ?? {}) as Record<string | number, unknown>;
  const copy: Record<string | number, unknown> = Array.isArray(source)
    ? ([...source] as never)
    : { ...source };
  copy[head!] = setIn(source[head!], rest, value);
  return copy as T;
}

/**
 * State for an editor form: values, field errors from the server, dirty
 * tracking with an "unsaved changes" guard, and a save helper that shows
 * a toast with the server's message.
 */
export function useEntityForm<T, R = unknown>(
  initial: T,
  save: (values: T) => Promise<ActionResult<R>>,
  options: { onSaved?: (result: ActionResult<R> & { ok: true }, values: T) => void } = {},
) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial));
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => JSON.stringify(values) !== savedJson, [values, savedJson]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = useCallback((path: string, value: unknown) => {
    setValues((prev) => setIn(prev, path.split("."), value));
  }, []);

  const error = useCallback((path: string) => errors[path]?.[0], [errors]);

  const submit = useCallback(
    (override?: Partial<T>) =>
      new Promise<ActionResult<R>>((resolve) => {
        const next = override ? { ...values, ...override } : values;
        startTransition(async () => {
          try {
            const result = await save(next);
            if (result.ok) {
              setErrors({});
              setValues(next);
              setSavedJson(JSON.stringify(next));
              toast.success(result.message ?? "Saved.");
              options.onSaved?.(result, next);
            } else {
              setErrors(result.fieldErrors ?? {});
              toast.error(result.error);
            }
            resolve(result);
          } catch {
            const result = {
              ok: false as const,
              error: "Saving failed. Check your connection and try again.",
            };
            toast.error(result.error);
            resolve(result);
          }
        });
      }),
    [values, save, options],
  );

  return { values, setValues, set, errors, error, submit, pending, dirty };
}

/** Runs a one-off action (delete, publish...) with toasts. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    <R>(action: () => Promise<ActionResult<R>>, after?: (result: ActionResult<R> & { ok: true }) => void) =>
      startTransition(async () => {
        try {
          const result = await action();
          if (result.ok) {
            if (result.message) toast.success(result.message);
            after?.(result);
          } else {
            toast.error(result.error);
          }
        } catch {
          toast.error("That didn't work. Check your connection and try again.");
        }
      }),
    [],
  );
  return { run, pending };
}
