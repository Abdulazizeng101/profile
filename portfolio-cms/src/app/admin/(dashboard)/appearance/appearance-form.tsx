"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { saveAppearance } from "@/server/actions/admin/settings";

type SectionKey =
  "about" | "projects" | "skills" | "experience" | "education" | "accomplishments" | "contact";
type Values = {
  defaultTheme: "dark" | "light" | "system";
  accent: "brass" | "gulf" | "sage" | "cobalt";
  sections: { key: SectionKey; visible: boolean }[];
  showProjectsButton: boolean;
  showCvButton: boolean;
  showContactButton: boolean;
};

const SECTION_NAMES: Record<SectionKey, string> = {
  about: "About",
  projects: "Projects",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  accomplishments: "Certifications & achievements",
  contact: "Contact",
};

// Swatch colours match the dark-theme values in globals.css.
const ACCENTS = [
  { key: "brass", name: "Brass", color: "#d6b26e" },
  { key: "gulf", name: "Gulf", color: "#6cc7bc" },
  { key: "sage", name: "Sage", color: "#a3c48f" },
  { key: "cobalt", name: "Cobalt", color: "#93aaf5" },
] as const;

export function AppearanceForm({ initial }: { initial: Values }) {
  const form = useEntityForm(initial, saveAppearance);
  const { values, set, setValues } = form;

  function move(index: number, delta: number) {
    setValues((v) => {
      const sections = [...v.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(index + delta, 0, item!);
      return { ...v, sections };
    });
  }

  return (
    <form
      className="grid gap-6 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <FormSection
        title="Theme"
        description="Visitors can still switch between dark and light; this sets what they see first."
      >
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="sr-only">Default theme</legend>
          {(
            [
              ["dark", "Dark", "Recommended"],
              ["light", "Light", ""],
              ["system", "Follow the visitor's device", ""],
            ] as const
          ).map(([key, label, note]) => (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm",
                values.defaultTheme === key
                  ? "border-accent bg-accent-soft"
                  : "border-border-strong hover:border-[var(--muted)]",
              )}
            >
              <input
                type="radio"
                name="defaultTheme"
                value={key}
                checked={values.defaultTheme === key}
                onChange={() => set("defaultTheme", key)}
                aria-labelledby={`theme-${key}-label`}
                aria-describedby={note ? `theme-${key}-hint` : undefined}
                className="accent-[var(--accent)]"
              />
              <span>
                <span id={`theme-${key}-label`}>{label}</span>
                {note ? (
                  <span id={`theme-${key}-hint`} className="block text-xs text-subtle">
                    {note}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
      </FormSection>

      <FormSection
        title="Accent colour"
        description="Used sparingly for buttons, links and highlights. All options meet contrast guidelines in both themes."
      >
        <fieldset className="flex flex-wrap gap-3">
          <legend className="sr-only">Accent colour</legend>
          {ACCENTS.map((a) => (
            <label
              key={a.key}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border px-3 py-2 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-accent-soft",
                values.accent === a.key
                  ? "border-accent bg-accent-soft"
                  : "border-border-strong hover:border-[var(--muted)]",
              )}
            >
              <input
                type="radio"
                name="accent"
                value={a.key}
                checked={values.accent === a.key}
                onChange={() => set("accent", a.key)}
                className="sr-only"
              />
              <span aria-hidden="true" className="size-4 rounded-full" style={{ background: a.color }} />
              {a.name}
            </label>
          ))}
        </fieldset>
      </FormSection>

      <FormSection
        title="Home page sections"
        description="Turn sections on or off and set their order. Sections with no published content are hidden automatically."
      >
        <ol className="grid gap-2">
          {values.sections.map((section, index) => (
            <li
              key={section.key}
              className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-3 py-2"
            >
              <span className="tabular w-6 text-center text-xs text-subtle">{index + 1}</span>
              <span className="flex-1 text-sm">{SECTION_NAMES[section.key]}</span>
              <Switch
                checked={section.visible}
                onCheckedChange={(v) => set(`sections.${index}.visible`, v)}
                aria-label={`Show ${SECTION_NAMES[section.key]}`}
              />
              <div className="flex">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="inline-flex size-7 items-center justify-center text-subtle hover:text-fg disabled:opacity-25"
                  aria-label={`Move ${SECTION_NAMES[section.key]} up`}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === values.sections.length - 1}
                  className="inline-flex size-7 items-center justify-center text-subtle hover:text-fg disabled:opacity-25"
                  aria-label={`Move ${SECTION_NAMES[section.key]} down`}
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </FormSection>

      <FormSection
        title="Hero buttons"
        description="Buttons only appear when there's something behind them (published projects, an uploaded CV)."
      >
        <div className="divide-y divide-border">
          <SwitchRow
            id="showProjectsButton"
            label="View my projects"
            checked={values.showProjectsButton}
            onCheckedChange={(v) => set("showProjectsButton", v)}
          />
          <SwitchRow
            id="showCvButton"
            label="Download CV"
            checked={values.showCvButton}
            onCheckedChange={(v) => set("showCvButton", v)}
          />
          <SwitchRow
            id="showContactButton"
            label="Contact me"
            checked={values.showContactButton}
            onCheckedChange={(v) => set("showContactButton", v)}
          />
        </div>
      </FormSection>

      <SaveBar dirty={form.dirty} pending={form.pending} onSave={() => void form.submit()} />
    </form>
  );
}
