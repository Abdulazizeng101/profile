"use client";

import { Tabs } from "radix-ui";
import type { ReactNode } from "react";

import type { FieldErrors } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/**
 * English / Arabic panels for translatable fields. A dot on a tab means it has
 * validation errors; "empty" means nothing is filled in for that language.
 */
export function LocaleTabs({
  errors,
  prefix = "translations",
  arabicFilled,
  children,
}: {
  errors?: FieldErrors;
  prefix?: string;
  arabicFilled?: boolean;
  children: (locale: "en" | "ar") => ReactNode;
}) {
  const hasError = (locale: string) =>
    Object.keys(errors ?? {}).some((key) => key.startsWith(`${prefix}.${locale}.`) && errors?.[key]?.length);

  const tab = (locale: "en" | "ar", label: string, note?: string) => (
    <Tabs.Trigger
      value={locale}
      className={cn(
        "relative -mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted",
        "hover:text-fg data-[state=active]:border-accent data-[state=active]:text-fg",
      )}
    >
      {label}
      {note ? <span className="text-xs text-subtle">{note}</span> : null}
      {hasError(locale) ? <span className="size-1.5 rounded-full bg-danger" aria-label="has errors" /> : null}
    </Tabs.Trigger>
  );

  return (
    <Tabs.Root defaultValue="en" className="grid gap-5">
      <Tabs.List aria-label="Content language" className="flex gap-1 border-b border-border">
        {tab("en", "English", "required")}
        {tab("ar", "العربية", arabicFilled === false ? "empty" : "optional")}
      </Tabs.List>
      <Tabs.Content value="en" className="grid gap-5 outline-none">
        {children("en")}
      </Tabs.Content>
      <Tabs.Content value="ar" className="grid gap-5 outline-none" lang="ar" dir="rtl">
        <p className="rounded-[var(--radius)] bg-surface-2 px-3 py-2 text-xs text-muted" dir="ltr" lang="en">
          Optional. Fields left empty show the English text on the Arabic site, marked as English (or are
          hidden, depending on Settings › Languages). Nothing is translated automatically.
        </p>
        {children("ar")}
      </Tabs.Content>
    </Tabs.Root>
  );
}
