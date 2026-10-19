"use client";

import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { SwitchRow } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { saveLocalization } from "@/server/actions/admin/settings";

type Values = { arabicEnabled: boolean; fallbackMode: "english" | "hide" };

export function LanguageForm({ initial }: { initial: Values }) {
  const form = useEntityForm(initial, saveLocalization);
  const { values, set } = form;

  return (
    <form
      className="grid gap-6 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <FormSection title="Arabic site">
        <SwitchRow
          id="arabicEnabled"
          label="Publish the Arabic version"
          description="Shows the language switcher and the /ar pages. Turn it off to run an English-only site."
          checked={values.arabicEnabled}
          onCheckedChange={(v) => set("arabicEnabled", v)}
        />
      </FormSection>
      <FormSection
        title="When Arabic text is missing"
        description="Nothing is ever machine-translated. Choose what visitors to the Arabic site see instead."
      >
        <fieldset className="grid gap-2">
          <legend className="sr-only">Fallback behaviour</legend>
          {(
            [
              [
                "english",
                "Show the English text",
                "Marked as English so it reads left-to-right. Recommended while you translate.",
              ],
              [
                "hide",
                "Hide the item",
                "Projects and entries without an Arabic title are left out of the Arabic site.",
              ],
            ] as const
          ).map(([key, label, note]) => (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm",
                values.fallbackMode === key ? "border-accent bg-accent-soft" : "border-border-strong",
              )}
            >
              <input
                type="radio"
                name="fallbackMode"
                checked={values.fallbackMode === key}
                onChange={() => set("fallbackMode", key)}
                aria-labelledby={`fallback-${key}-label`}
                aria-describedby={`fallback-${key}-hint`}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>
                <span id={`fallback-${key}-label`}>{label}</span>
                <span id={`fallback-${key}-hint`} className="block text-xs text-subtle">
                  {note}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </FormSection>
      <SaveBar dirty={form.dirty} pending={form.pending} onSave={() => void form.submit()} />
    </form>
  );
}
