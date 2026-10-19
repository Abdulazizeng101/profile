"use client";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Textarea } from "@/components/ui/field";
import type { AboutInput } from "@/lib/validation/content";
import { saveAbout } from "@/server/actions/admin/profile";

export function AboutForm({ initial }: { initial: AboutInput }) {
  const form = useEntityForm(initial, saveAbout);
  const { values, set, error } = form;
  const ar = values.translations.ar;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
      className="grid gap-6 pb-24"
    >
      <FormSection title="About section" description="Shown in the About section of the home page.">
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(ar.bio || ar.personalStatement)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const v = values.translations[locale];
            const dir = locale === "ar" ? "rtl" : "ltr";
            return (
              <>
                <Field
                  id={`${p}.personalStatement`}
                  label="Personal statement"
                  hint="One or two sentences that sum up how you work. Shown large at the top of the section."
                  error={error(`${p}.personalStatement`)}
                >
                  <Textarea
                    {...fieldAria(`${p}.personalStatement`, error(`${p}.personalStatement`), true)}
                    value={v.personalStatement ?? ""}
                    onChange={(e) => set(`${p}.personalStatement`, e.target.value)}
                    rows={2}
                    maxLength={1000}
                    dir={dir}
                  />
                </Field>
                <MarkdownEditor
                  id={`${p}.bio`}
                  label="Professional biography"
                  hint="Your background, including your Software Engineering studies at KFUPM, and what you've worked on."
                  value={v.bio ?? ""}
                  onChange={(value) => set(`${p}.bio`, value)}
                  error={error(`${p}.bio`)}
                  rows={10}
                  dir={dir}
                />
                <MarkdownEditor
                  id={`${p}.disciplines`}
                  label="Preferred engineering disciplines"
                  hint="For example backend systems, web platforms, data engineering. A short list works well."
                  value={v.disciplines ?? ""}
                  onChange={(value) => set(`${p}.disciplines`, value)}
                  error={error(`${p}.disciplines`)}
                  rows={4}
                  dir={dir}
                />
                <MarkdownEditor
                  id={`${p}.interests`}
                  label="Interests in software and technology"
                  value={v.interests ?? ""}
                  onChange={(value) => set(`${p}.interests`, value)}
                  error={error(`${p}.interests`)}
                  rows={4}
                  dir={dir}
                />
                <MarkdownEditor
                  id={`${p}.careerGoals`}
                  label="Career goals"
                  value={v.careerGoals ?? ""}
                  onChange={(value) => set(`${p}.careerGoals`, value)}
                  error={error(`${p}.careerGoals`)}
                  rows={4}
                  dir={dir}
                />
              </>
            );
          }}
        </LocaleTabs>
      </FormSection>
      <SaveBar
        dirty={form.dirty}
        pending={form.pending}
        onSave={() => void form.submit()}
        previewPath="/en"
      />
    </form>
  );
}
