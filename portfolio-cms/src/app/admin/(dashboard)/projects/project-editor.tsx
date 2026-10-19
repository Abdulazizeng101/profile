"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { SkillPicker } from "@/components/admin/skill-picker";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { slugify } from "@/lib/utils";
import type { ProjectInput } from "@/lib/validation/content";
import { saveProject } from "@/server/actions/admin/projects";

const CHAPTERS = [
  { key: "overview", label: "Overview", hint: "What the project is, who it's for, and its current state." },
  { key: "problem", label: "Problem", hint: "The problem it solves, and for whom." },
  { key: "solution", label: "Solution", hint: "How it works and the key design decisions." },
  {
    key: "role",
    label: "My role and responsibilities",
    hint: "Team size, what you owned, what you built yourself.",
  },
  { key: "features", label: "Key features", hint: "A bulleted list works best." },
  {
    key: "architecture",
    label: "Technical architecture",
    hint: "Main components and how they communicate. Add diagrams in the Images panel.",
  },
  {
    key: "challenges",
    label: "Challenges and solutions",
    hint: "Real obstacles you hit and how you dealt with them.",
  },
] as const;

export function ProjectEditor({
  projectId,
  initial,
  categories,
  skills,
}: {
  projectId: string | null;
  initial: ProjectInput;
  categories: { id: string; nameEn: string }[];
  skills: { id: string; name: string; category: string }[];
}) {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(Boolean(projectId));
  const form = useEntityForm(initial, (values) => saveProject(projectId, values), {
    onSaved: (result) => {
      if (!projectId && result.data?.id) router.replace(`/admin/projects/${result.data.id}`);
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
      <FormSection title="Basics">
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(t.ar.title)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const dir = locale === "ar" ? "rtl" : "ltr";
            return (
              <>
                <Field
                  id={`${p}.title`}
                  label="Project name"
                  required={locale === "en"}
                  error={error(`${p}.title`)}
                >
                  <Input
                    {...fieldAria(`${p}.title`, error(`${p}.title`))}
                    value={t[locale].title ?? ""}
                    onChange={(e) => {
                      set(`${p}.title`, e.target.value);
                      if (locale === "en" && !slugTouched) set("slug", slugify(e.target.value));
                    }}
                    maxLength={120}
                    dir={dir}
                  />
                </Field>
                <Field
                  id={`${p}.summary`}
                  label="Short description"
                  hint="One or two sentences for the project card. Required to publish."
                  error={error(`${p}.summary`)}
                >
                  <Textarea
                    {...fieldAria(`${p}.summary`, error(`${p}.summary`), true)}
                    value={t[locale].summary ?? ""}
                    onChange={(e) => set(`${p}.summary`, e.target.value)}
                    maxLength={300}
                    rows={2}
                    dir={dir}
                  />
                </Field>
              </>
            );
          }}
        </LocaleTabs>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            id="slug"
            label="URL slug"
            hint={`Page address: /en/projects/${values.slug || "…"}`}
            error={error("slug")}
            required
          >
            <Input
              {...fieldAria("slug", error("slug"), true)}
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              dir="ltr"
              maxLength={80}
            />
          </Field>
          <Field id="categoryId" label="Category" error={error("categoryId")}>
            <Select
              id="categoryId"
              value={values.categoryId ?? ""}
              onChange={(e) => set("categoryId", e.target.value || null)}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="stage" label="Project status">
            <Select
              id="stage"
              value={values.stage ?? "completed"}
              onChange={(e) => set("stage", e.target.value)}
            >
              <option value="completed">Completed</option>
              <option value="in_progress">In progress</option>
              <option value="maintained">Maintained</option>
              <option value="prototype">Prototype</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="startDate" label="Start date" error={error("startDate")}>
              <Input
                {...fieldAria("startDate", error("startDate"))}
                type="date"
                value={values.startDate ?? ""}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field id="endDate" label="Completion date" error={error("endDate")}>
              <Input
                {...fieldAria("endDate", error("endDate"))}
                type="date"
                value={values.endDate ?? ""}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="divide-y divide-border">
          <SwitchRow
            id="isFeatured"
            label="Featured project"
            description="Featured projects appear first on the home page."
            checked={values.isFeatured ?? false}
            onCheckedChange={(v) => set("isFeatured", v)}
          />
          {values.isSample || initial.isSample ? (
            <SwitchRow
              id="isSample"
              label="This is sample content"
              description="Sample projects can't be published. Turn this off once you've replaced every placeholder."
              checked={values.isSample ?? false}
              onCheckedChange={(v) => set("isSample", v)}
            />
          ) : null}
        </div>
        {error("isSample") ? <p className="text-sm text-danger">{error("isSample")}</p> : null}
      </FormSection>

      <FormSection title="Technologies and links">
        <SkillPicker
          label="Technologies and tools"
          hint="Pick from your skills or type a new one. These power the technology filter on the Projects page."
          options={skills}
          value={values.skillIds ?? []}
          onChange={(ids) => set("skillIds", ids)}
        />
        <div className="grid gap-5 md:grid-cols-3">
          {(
            [
              ["repoUrl", "GitHub repository", "https://github.com/…"],
              ["liveUrl", "Live demo", "https://…"],
              ["videoUrl", "Video (YouTube, Vimeo or Loom)", "https://youtu.be/…"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <Field key={key} id={key} label={label} error={error(key)}>
              <Input
                {...fieldAria(key, error(key))}
                type="url"
                value={values[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                dir="ltr"
              />
            </Field>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Case study"
        description="The detail page. Each part is optional; empty parts are left out."
      >
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(t.ar.overview || t.ar.problem)}>
          {(locale) =>
            CHAPTERS.map((chapter) => (
              <MarkdownEditor
                key={`${locale}-${chapter.key}`}
                id={`translations.${locale}.${chapter.key}`}
                label={chapter.label}
                hint={chapter.hint}
                value={t[locale][chapter.key] ?? ""}
                onChange={(value) => set(`translations.${locale}.${chapter.key}`, value)}
                error={error(`translations.${locale}.${chapter.key}`)}
                dir={locale === "ar" ? "rtl" : "ltr"}
                rows={chapter.key === "overview" ? 6 : 5}
              />
            ))
          }
        </LocaleTabs>
      </FormSection>

      <SaveBar
        dirty={form.dirty}
        pending={form.pending}
        onSave={() => saveAs(values.status ?? "draft")}
        publishable
        status={initial.status ?? "draft"}
        onSaveAs={saveAs}
        previewPath={projectId ? `/en/projects/${initial.slug}` : undefined}
      />
    </form>
  );
}
