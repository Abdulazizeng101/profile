"use client";

import { Bold, Heading3, Italic, Link as LinkIcon, List, ListOrdered } from "lucide-react";
import { useId, useState } from "react";

import { Markdown } from "@/components/shared/markdown";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
  dir?: "ltr" | "rtl";
  maxLength?: number;
  placeholder?: string;
};

/**
 * Markdown editor with a small formatting toolbar and a live preview that uses
 * the same renderer as the public site.
 */
export function MarkdownEditor({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  rows = 6,
  dir = "ltr",
  maxLength,
  placeholder,
}: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textarea = () => document.getElementById(fieldId) as HTMLTextAreaElement | null;

  function wrap(before: string, after = before, fallback = "text") {
    const el = textarea();
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || fallback;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLines(prefix: (index: number) => string) {
    const el = textarea();
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const end = el.selectionEnd;
    const block = value.slice(start, end) || "Item";
    const replaced = block
      .split("\n")
      .map((line, i) => prefix(i) + line.replace(/^(\s*([-*]|\d+\.)\s+)/, ""))
      .join("\n");
    onChange(value.slice(0, start) + replaced + value.slice(end));
    requestAnimationFrame(() => el.focus());
  }

  const tools = [
    { label: "Bold", icon: Bold, run: () => wrap("**") },
    { label: "Italic", icon: Italic, run: () => wrap("_") },
    { label: "Heading", icon: Heading3, run: () => prefixLines(() => "### ") },
    { label: "Bulleted list", icon: List, run: () => prefixLines(() => "- ") },
    { label: "Numbered list", icon: ListOrdered, run: () => prefixLines((i) => `${i + 1}. `) },
    { label: "Link", icon: LinkIcon, run: () => wrap("[", "](https://)", "link text") },
  ];

  return (
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {label}
        </label>
        <div
          role="tablist"
          aria-label={`${label} mode`}
          className="flex rounded-[var(--radius-sm)] border border-border p-0.5 text-xs"
        >
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-[3px] px-2 py-0.5 capitalize",
                mode === m ? "bg-surface-2 text-fg" : "text-subtle hover:text-fg",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius)] border bg-bg",
          error ? "border-danger" : "border-border-strong focus-within:border-accent",
        )}
      >
        {mode === "write" ? (
          <>
            <div className="flex gap-0.5 border-b border-border px-1.5 py-1" dir="ltr">
              {tools.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  onClick={tool.run}
                  title={tool.label}
                  aria-label={tool.label}
                  className="inline-flex size-7 items-center justify-center rounded-[3px] text-subtle hover:bg-surface-2 hover:text-fg"
                >
                  <tool.icon className="size-3.5" />
                </button>
              ))}
            </div>
            <textarea
              id={fieldId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={rows}
              dir={dir}
              maxLength={maxLength}
              placeholder={placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
              className="block w-full resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed text-fg outline-none placeholder:text-subtle"
            />
          </>
        ) : (
          <div className="min-h-32 px-4 py-3 text-sm" dir={dir}>
            {value.trim() ? (
              <Markdown>{value}</Markdown>
            ) : (
              <p className="text-subtle">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
