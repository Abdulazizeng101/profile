"use client";

import { Plus, X } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { findOrCreateSkill } from "@/server/actions/admin/skills";

type Option = { id: string; name: string; category: string };

/**
 * Technology tags. Picks from your skills; typing a new name and pressing
 * Enter creates it (hidden from the Skills section until you choose to show it).
 */
export function SkillPicker({
  label,
  hint,
  options: initialOptions,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const id = useId();
  const [options, setOptions] = useState(initialOptions);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((o) => !value.includes(o.id) && (!q || o.name.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [options, query, value]);
  const exact = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());

  function add(optionId: string) {
    if (!value.includes(optionId)) onChange([...value, optionId]);
    setQuery("");
    setActive(0);
  }

  function create() {
    const name = query.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await findOrCreateSkill(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const created = result.data!;
      setOptions((prev) =>
        prev.some((o) => o.id === created.id) ? prev : [...prev, { ...created, category: "" }],
      );
      add(created.id);
      if (result.message) toast.success(result.message);
    });
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[var(--radius)] border border-border-strong bg-bg px-2 py-1.5 focus-within:border-accent">
        {value.map((skillId) => (
          <span
            key={skillId}
            className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 ps-2.5 pe-1 text-xs"
          >
            {byId.get(skillId)?.name ?? "Unknown"}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== skillId))}
              aria-label={`Remove ${byId.get(skillId)?.name ?? "item"}`}
              className="inline-flex size-4 items-center justify-center rounded-full text-subtle hover:bg-border hover:text-fg"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <div className="relative min-w-40 flex-1">
          <input
            id={id}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (
                  matches[active] &&
                  (query === "" || matches[active]!.name.toLowerCase().includes(query.toLowerCase()))
                ) {
                  add(matches[active]!.id);
                } else if (query.trim()) {
                  create();
                }
              } else if (e.key === "Backspace" && !query && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            role="combobox"
            aria-expanded={open && (matches.length > 0 || Boolean(query))}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-describedby={hint ? `${id}-hint` : undefined}
            placeholder={value.length ? "" : "Type to search or add, e.g. TypeScript"}
            className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-subtle"
          />
          {open && (matches.length > 0 || (query.trim() && !exact)) ? (
            <ul
              id={`${id}-list`}
              role="listbox"
              className="absolute start-0 top-full z-20 mt-1 max-h-64 w-64 overflow-auto rounded-[var(--radius)] border border-border-strong bg-surface p-1 shadow-lg"
            >
              {matches.map((option, index) => (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(option.id);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-[3px] px-2 py-1.5 text-sm ${index === active ? "bg-surface-2" : ""}`}
                >
                  <span>{option.name}</span>
                  {option.category ? (
                    <span className="truncate text-xs text-subtle">{option.category}</span>
                  ) : null}
                </li>
              ))}
              {query.trim() && !exact ? (
                <li
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    create();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-[3px] px-2 py-1.5 text-sm text-muted hover:bg-surface-2"
                >
                  <Plus className="size-3.5" /> {pending ? "Adding…" : `Add “${query.trim()}”`}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
