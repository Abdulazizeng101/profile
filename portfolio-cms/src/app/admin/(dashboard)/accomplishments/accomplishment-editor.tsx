"use client";

import { useRouter } from "next/navigation";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { DocumentField } from "@/components/admin/media-field";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Input, Select } from "@/components/ui/field";
import type { DocumentView } from "@/lib/types/media";
import type { AccomplishmentInput } from "@/lib/validation/content";
import { saveAccomplishment } from "@/server/actions/admin/entries";

export function AccomplishmentEditor({
  entryId,
  initial,
  document,
}: {
  entryId: string | null;
  initial: AccomplishmentInput;
  document: DocumentView | null;
}) {
  const router = useRouter();
  const form = useEntityForm(initial, (values) => saveAccomplishment(entryId, values), {
    onSaved: (result) => {
      if (!entryId && result.data?.id) router.replace(`/admin/accomplishments/${result.data.id}`);
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
      <FormSection title="Details">
        <Field id="kind" label="Type">
          <Select
            id="kind"
            value={values.kind}
            onChange={(e) => set("kind", e.target.value)}
            className="md:w-72"
          >
            <option value="certification">Professional certification</option>
            <option value="course">Technical course</option>
            <option value="award">Award or achievement</option>
            <option value="competition">Competition</option>
            <option value="publication">Publication</option>
            <option value="volunteer">Volunteer work</option>
          </Select>
        </Field>
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(t.ar.title)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const dir = locale === "ar" ? "rtl" : "ltr";
            return (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    id={`${p}.title`}
                    label="Title"
                    required={locale === "en"}
                    error={error(`${p}.title`)}
                  >
                    <Input
                      {...fieldAria(`${p}.title`, error(`${p}.title`))}
                      value={t[locale].title ?? ""}
                      onChange={(e) => set(`${p}.title`, e.target.value)}
                      dir={dir}
                    />
                  </Field>
                  <Field id={`${p}.issuer`} label="Issuing organization" error={error(`${p}.issuer`)}>
                    <Input
                      {...fieldAria(`${p}.issuer`, error(`${p}.issuer`))}
                      value={t[locale].issuer ?? ""}
                      onChange={(e) => set(`${p}.issuer`, e.target.value)}
                      dir={dir}
                    />
                  </Field>
                </div>
                <MarkdownEditor
                  id={`${p}.description`}
                  label="Description (optional)"
                  value={t[locale].description ?? ""}
                  onChange={(v) => set(`${p}.description`, v)}
                  error={error(`${p}.description`)}
                  dir={dir}
                  rows={3}
                />
              </>
            );
          }}
        </LocaleTabs>
      </FormSection>

      <FormSection title="Dates and credentials">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="issuedOn" label="Issue date" error={error("issuedOn")}>
            <Input
              {...fieldAria("issuedOn", error("issuedOn"))}
              type="date"
              value={values.issuedOn ?? ""}
              onChange={(e) => set("issuedOn", e.target.value)}
            />
          </Field>
          <Field id="expiresOn" label="Expiry date (optional)" error={error("expiresOn")}>
            <Input
              {...fieldAria("expiresOn", error("expiresOn"))}
              type="date"
              value={values.expiresOn ?? ""}
              onChange={(e) => set("expiresOn", e.target.value)}
            />
          </Field>
          <Field id="credentialId" label="Credential ID (optional)" error={error("credentialId")}>
            <Input
              {...fieldAria("credentialId", error("credentialId"))}
              value={values.credentialId ?? ""}
              onChange={(e) => set("credentialId", e.target.value)}
              dir="ltr"
            />
          </Field>
          <Field id="credentialUrl" label="Credential URL (optional)" error={error("credentialUrl")}>
            <Input
              {...fieldAria("credentialUrl", error("credentialUrl"))}
              type="url"
              value={values.credentialUrl ?? ""}
              onChange={(e) => set("credentialUrl", e.target.value)}
              dir="ltr"
              placeholder="https://"
            />
          </Field>
        </div>
        <DocumentField
          label="Certificate PDF (optional)"
          description="Linked when you save the entry. Visitors can open it from the site."
          value={values.documentId}
          initialView={document}
          onChange={(id) => set("documentId", id)}
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
