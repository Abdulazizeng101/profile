"use client";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Input, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { saveContactSettings } from "@/server/actions/admin/settings";

type Values = {
  contactFormEnabled: boolean;
  translations: Record<"en" | "ar", { contactHeading: string; contactText: string; footerNote: string }>;
};

export function ContactSettingsForm({ initial }: { initial: Values }) {
  const form = useEntityForm(initial, saveContactSettings);
  const { values, set, error } = form;

  return (
    <form
      className="grid gap-6 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <FormSection
        title="Contact section"
        description="The invitation recruiters see next to your contact details."
      >
        <SwitchRow
          id="contactFormEnabled"
          label="Show the contact form"
          description="Messages are saved to your dashboard inbox. Add SMTP settings to also receive them by email."
          checked={values.contactFormEnabled}
          onCheckedChange={(v) => set("contactFormEnabled", v)}
        />
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(values.translations.ar.contactHeading)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const dir = locale === "ar" ? "rtl" : "ltr";
            return (
              <>
                <Field id={`${p}.contactHeading`} label="Heading" error={error(`${p}.contactHeading`)}>
                  <Input
                    {...fieldAria(`${p}.contactHeading`, error(`${p}.contactHeading`))}
                    value={values.translations[locale].contactHeading}
                    onChange={(e) => set(`${p}.contactHeading`, e.target.value)}
                    dir={dir}
                    maxLength={120}
                  />
                </Field>
                <Field id={`${p}.contactText`} label="Invitation text" error={error(`${p}.contactText`)}>
                  <Textarea
                    {...fieldAria(`${p}.contactText`, error(`${p}.contactText`))}
                    value={values.translations[locale].contactText}
                    onChange={(e) => set(`${p}.contactText`, e.target.value)}
                    dir={dir}
                    rows={3}
                    maxLength={600}
                  />
                </Field>
                <Field
                  id={`${p}.footerNote`}
                  label="Footer note (optional)"
                  hint="A short line under your name in the footer."
                  error={error(`${p}.footerNote`)}
                >
                  <Input
                    {...fieldAria(`${p}.footerNote`, error(`${p}.footerNote`), true)}
                    value={values.translations[locale].footerNote}
                    onChange={(e) => set(`${p}.footerNote`, e.target.value)}
                    dir={dir}
                    maxLength={200}
                  />
                </Field>
              </>
            );
          }}
        </LocaleTabs>
      </FormSection>
      <SaveBar dirty={form.dirty} pending={form.pending} onSave={() => void form.submit()} />
    </form>
  );
}
