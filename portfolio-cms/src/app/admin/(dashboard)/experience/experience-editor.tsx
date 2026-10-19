"use client";

import { useRouter } from "next/navigation";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { ImageField } from "@/components/admin/media-field";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { SkillPicker } from "@/components/admin/skill-picker";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Input, Select } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import type { ImageView } from "@/lib/types/media";
import type { ExperienceInput } from "@/lib/validation/content";
import { saveExperience } from "@/server/actions/admin/entries";

const STATES = [
  { value: "completed", label: "Completed", hint: "Finished. Needs start and end dates in the past." },
  { value: "current", label: "Current", hint: "Ongoing. Started already; no end date." },
  { value: "planned", label: "Planned", hint: "Confirmed but not started. Shown under Upcoming." },
] as const;

export function ExperienceEditor({
  entryId,
  initial,
  logo,
  skills,
}: {
  entryId: string | null;
  initial: ExperienceInput;
  logo: ImageView | null;
  skills: { id: string; name: string; category: string }[];
}) {
  const router = useRouter();
  const form = useEntityForm(initial, (values) => saveExperience(entryId, values), {
    onSaved: (result) => {
      if (!entryId && result.data?.id) router.replace(`/admin/experience/${result.data.id}`);
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
      <FormSection title="Role">
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(t.ar.role)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const dir = locale === "ar" ? "rtl" : "ltr";
            const text = (key: "organization" | "role" | "location", label: string, required = false) => (
              <Field
                id={`${p}.${key}`}
                label={label}
                required={required && locale === "en"}
                error={error(`${p}.${key}`)}
              >
                <Input
                  {...fieldAria(`${p}.${key}`, error(`${p}.${key}`))}
                  value={t[locale][key] ?? ""}
                  onChange={(e) => set(`${p}.${key}`, e.target.value)}
                  dir={dir}
                />
              </Field>
            );
            return (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  {text("role", "Position or role", true)}
                  {text("organization", "Company or organization", true)}
                </div>
                {text("location", "Location")}
                <MarkdownEditor
                  id={`${p}.description`}
                  label="Description"
                  value={t[locale].description ?? ""}
                  onChange={(v) => set(`${p}.description`, v)}
                  error={error(`${p}.description`)}
                  dir={dir}
                  rows={4}
                />
                <MarkdownEditor
                  id={`${p}.responsibilities`}
                  label="Responsibilities"
                  hint="A bulleted list of what you were responsible for."
                  value={t[locale].responsibilities ?? ""}
                  onChange={(v) => set(`${p}.responsibilities`, v)}
                  error={error(`${p}.responsibilities`)}
                  dir={dir}
                  rows={5}
                />
                <MarkdownEditor
                  id={`${p}.achievements`}
                  label="Achievements"
                  hint="Concrete results. Only include what actually happened."
                  value={t[locale].achievements ?? ""}
                  onChange={(v) => set(`${p}.achievements`, v)}
                  error={error(`${p}.achievements`)}
                  dir={dir}
                  rows={4}
                />
              </>
            );
          }}
        </LocaleTabs>
      </FormSection>

      <FormSection
        title="Type, status and dates"
        description="The status must agree with the dates; the server checks this when you save."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="type" label="Employment type">
            <Select
              id="type"
              value={values.type ?? "full_time"}
              onChange={(e) => set("type", e.target.value)}
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="internship">Internship</option>
              <option value="coop">Cooperative training (co-op)</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
              <option value="research">Research</option>
              <option value="teaching">Teaching assistant</option>
              <option value="volunteer">Volunteer</option>
              <option value="activity">Technical activity</option>
            </Select>
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium">Status</legend>
            {STATES.map((s) => (
              <div key={s.value} className="flex items-start gap-2.5 text-sm">
                <input
                  id={`state-${s.value}`}
                  type="radio"
                  name="state"
                  value={s.value}
                  checked={values.state === s.value}
                  onChange={() => {
                    set("state", s.value);
                    if (s.value === "current") set("endDate", "");
                  }}
                  aria-describedby={`state-${s.value}-hint`}
                  className="mt-1 accent-[var(--accent)]"
                />
                <div>
                  <label htmlFor={`state-${s.value}`} className="cursor-pointer">
                    {s.label}
                  </label>
                  <p id={`state-${s.value}-hint`} className="text-xs text-subtle">
                    {s.hint}
                  </p>
                </div>
              </div>
            ))}
          </fieldset>
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
            label="End date"
            hint={values.state === "current" ? "Not used for a current role." : undefined}
            error={error("endDate")}
          >
            <Input
              {...fieldAria("endDate", error("endDate"), values.state === "current")}
              type="date"
              value={values.endDate ?? ""}
              onChange={(e) => set("endDate", e.target.value)}
              disabled={values.state === "current"}
            />
          </Field>
        </div>
        <SwitchRow
          id="isRemote"
          label="Remote"
          checked={values.isRemote ?? false}
          onCheckedChange={(v) => set("isRemote", v)}
        />
      </FormSection>

      <FormSection title="Technologies, link and logo">
        <SkillPicker
          label="Technologies used"
          options={skills}
          value={values.skillIds ?? []}
          onChange={(ids) => set("skillIds", ids)}
        />
        <Field id="url" label="Company website (optional)" error={error("url")}>
          <Input
            {...fieldAria("url", error("url"))}
            type="url"
            value={values.url ?? ""}
            onChange={(e) => set("url", e.target.value)}
            dir="ltr"
            placeholder="https://"
          />
        </Field>
        <ImageField
          label="Company logo (optional)"
          description="Square logos work best. Linked when you save the entry."
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
