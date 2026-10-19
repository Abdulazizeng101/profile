"use client";

import { useRouter } from "next/navigation";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { ImageField } from "@/components/admin/media-field";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Input, Select } from "@/components/ui/field";
import type { ImageView } from "@/lib/types/media";
import type { EducationInput } from "@/lib/validation/content";
import { saveEducation } from "@/server/actions/admin/entries";

export function EducationEditor({
  entryId,
  initial,
  logo,
}: {
  entryId: string | null;
  initial: EducationInput;
  logo: ImageView | null;
}) {
  const router = useRouter();
  const form = useEntityForm(initial, (values) => saveEducation(entryId, values), {
    onSaved: (result) => {
      if (!entryId && result.data?.id) router.replace(`/admin/education/${result.data.id}`);
      else router.refresh();
    },
  });
  const { values, set, error } = form;
  const t = values.translations;
  const saveAs = (status: "draft" | "published") => void form.submit({ status });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveAs(values.status ?? "draft");
      }}
      className="grid gap-6 pb-24"
    >
      <FormSection title="Degree">
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(t.ar.institution)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const dir = locale === "ar" ? "rtl" : "ltr";
            const text = (
              key: "institution" | "degree" | "field" | "location",
              label: string,
              required = false,
              hint?: string,
            ) => (
              <Field
                id={`${p}.${key}`}
                label={label}
                hint={hint}
                required={required && locale === "en"}
                error={error(`${p}.${key}`)}
              >
                <Input
                  {...fieldAria(`${p}.${key}`, error(`${p}.${key}`), Boolean(hint))}
                  value={t[locale][key] ?? ""}
                  onChange={(e) => set(`${p}.${key}`, e.target.value)}
                  dir={dir}
                />
              </Field>
            );
            return (
              <>
                {text("institution", "Institution", true)}
                <div className="grid gap-5 md:grid-cols-2">
                  {text("degree", "Degree", true, "For example: Bachelor of Science")}
                  {text("field", "Field of study", false, "For example: Software Engineering")}
                </div>
                {text("location", "Location")}
                <MarkdownEditor
                  id={`${p}.description`}
                  label="Relevant academic information"
                  hint="Senior project, focus areas, or anything a recruiter should know."
                  value={t[locale].description ?? ""}
                  onChange={(v) => set(`${p}.description`, v)}
                  error={error(`${p}.description`)}
                  dir={dir}
                  rows={4}
                />
                <MarkdownEditor
                  id={`${p}.courses`}
                  label="Relevant courses (optional)"
                  value={t[locale].courses ?? ""}
                  onChange={(v) => set(`${p}.courses`, v)}
                  error={error(`${p}.courses`)}
                  dir={dir}
                  rows={4}
                />
                <MarkdownEditor
                  id={`${p}.honors`}
                  label="Honors, awards and activities (optional)"
                  hint="Only list honors you actually received."
                  value={t[locale].honors ?? ""}
                  onChange={(v) => set(`${p}.honors`, v)}
                  error={error(`${p}.honors`)}
                  dir={dir}
                  rows={3}
                />
              </>
            );
          }}
        </LocaleTabs>
      </FormSection>

      <FormSection title="Dates and details">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="educationStatus" label="Status">
            <Select
              id="educationStatus"
              value={values.educationStatus ?? "graduated"}
              onChange={(e) => set("educationStatus", e.target.value)}
            >
              <option value="graduated">Graduated</option>
              <option value="in_progress">In progress (expected graduation)</option>
            </Select>
          </Field>
          <Field
            id="grade"
            label="GPA or grade (optional)"
            hint="Leave empty to hide it. Shown exactly as you type it, e.g. 3.6 / 4.0."
            error={error("grade")}
          >
            <Input
              {...fieldAria("grade", error("grade"), true)}
              value={values.grade ?? ""}
              onChange={(e) => set("grade", e.target.value)}
              dir="ltr"
              maxLength={40}
            />
          </Field>
          <Field id="startDate" label="Start date" error={error("startDate")}>
            <Input
              {...fieldAria("startDate", error("startDate"))}
              type="date"
              value={values.startDate ?? ""}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
          <Field
            id="endDate"
            label={values.educationStatus === "in_progress" ? "Expected graduation" : "Graduation date"}
            error={error("endDate")}
          >
            <Input
              {...fieldAria("endDate", error("endDate"))}
              type="date"
              value={values.endDate ?? ""}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </Field>
        </div>
        <Field id="url" label="Institution website (optional)" error={error("url")}>
          <Input
            {...fieldAria("url", error("url"))}
            type="url"
            value={values.url ?? ""}
            onChange={(e) => set("url", e.target.value)}
            dir="ltr"
          />
        </Field>
        <ImageField
          label="Institution logo (optional)"
          description="Linked when you save the entry."
          value={values.logoId}
          initialView={logo}
          onChange={(id) => set("logoId", id)}
        />
      </FormSection>

      <SaveBar
        dirty={form.dirty}
        pending={form.pending}
        onSave={() => saveAs(values.status ?? "draft")}
        publishable
        status={initial.status ?? "draft"}
        onSaveAs={saveAs}
        previewPath={entryId ? "/en" : undefined}
      />
    </form>
  );
}
