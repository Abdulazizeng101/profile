"use client";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import type { ProfileInput } from "@/lib/validation/content";
import { saveProfile } from "@/server/actions/admin/profile";

export function ProfileForm({ initial }: { initial: ProfileInput }) {
  const form = useEntityForm(initial, saveProfile);
  const { values, set, error } = form;
  const t = values.translations;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
      className="grid gap-6 pb-24"
    >
      <FormSection
        title="Name and introduction"
        description="Shown in the hero section and used for page titles."
      >
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(t.ar.fullName || t.ar.headline || t.ar.intro)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const v = t[locale];
            const dir = locale === "ar" ? "rtl" : "ltr";
            return (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    id={`${p}.fullName`}
                    label="Full name"
                    required={locale === "en"}
                    error={error(`${p}.fullName`)}
                  >
                    <Input
                      {...fieldAria(`${p}.fullName`, error(`${p}.fullName`))}
                      value={v.fullName ?? ""}
                      onChange={(e) => set(`${p}.fullName`, e.target.value)}
                      dir={dir}
                      maxLength={100}
                      autoComplete="off"
                    />
                  </Field>
                  <Field
                    id={`${p}.headline`}
                    label="Professional title"
                    required={locale === "en"}
                    hint="For example: Software Engineer, or Full-Stack Software Engineer."
                    error={error(`${p}.headline`)}
                  >
                    <Input
                      {...fieldAria(`${p}.headline`, error(`${p}.headline`), true)}
                      value={v.headline ?? ""}
                      onChange={(e) => set(`${p}.headline`, e.target.value)}
                      dir={dir}
                      maxLength={120}
                    />
                  </Field>
                </div>
                <Field
                  id={`${p}.intro`}
                  label="Short introduction"
                  hint="Two or three sentences shown under your name. Keep it specific."
                  error={error(`${p}.intro`)}
                >
                  <Textarea
                    {...fieldAria(`${p}.intro`, error(`${p}.intro`), true)}
                    value={v.intro ?? ""}
                    onChange={(e) => set(`${p}.intro`, e.target.value)}
                    dir={dir}
                    maxLength={400}
                    rows={3}
                  />
                </Field>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    id={`${p}.location`}
                    label="Location"
                    hint="City and country, e.g. Dhahran, Saudi Arabia."
                    error={error(`${p}.location`)}
                  >
                    <Input
                      {...fieldAria(`${p}.location`, error(`${p}.location`), true)}
                      value={v.location ?? ""}
                      onChange={(e) => set(`${p}.location`, e.target.value)}
                      dir={dir}
                      maxLength={100}
                    />
                  </Field>
                  <Field
                    id={`${p}.availabilityLabel`}
                    label="Custom availability text"
                    hint="Only used when availability is set to Custom."
                    error={error(`${p}.availabilityLabel`)}
                  >
                    <Input
                      {...fieldAria(`${p}.availabilityLabel`, error(`${p}.availabilityLabel`), true)}
                      value={v.availabilityLabel ?? ""}
                      onChange={(e) => set(`${p}.availabilityLabel`, e.target.value)}
                      dir={dir}
                      maxLength={60}
                    />
                  </Field>
                </div>
                <Field
                  id={`${p}.languages`}
                  label="Languages"
                  hint="Optional. Shown in the hero panel, e.g. “Arabic (native), English (professional)”. Leave empty to hide."
                  error={error(`${p}.languages`)}
                >
                  <Input
                    {...fieldAria(`${p}.languages`, error(`${p}.languages`), true)}
                    value={v.languages ?? ""}
                    onChange={(e) => set(`${p}.languages`, e.target.value)}
                    dir={dir}
                    maxLength={120}
                  />
                </Field>
              </>
            );
          }}
        </LocaleTabs>
      </FormSection>

      <FormSection title="Availability" description="A status shown next to your role in the hero.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="availability" label="Status">
            <Select
              id="availability"
              value={values.availability}
              onChange={(e) => set("availability", e.target.value)}
            >
              <option value="open">Open to opportunities</option>
              <option value="selective">Open to selected opportunities</option>
              <option value="not_looking">Not looking right now</option>
              <option value="custom">Custom text</option>
            </Select>
          </Field>
        </div>
        <SwitchRow
          id="showAvailability"
          label="Show availability on the site"
          checked={values.showAvailability ?? true}
          onCheckedChange={(v) => set("showAvailability", v)}
        />
      </FormSection>

      <FormSection
        title="Contact details"
        description="Nothing here is shown publicly unless you switch it on."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="email" label="Professional email" error={error("email")}>
            <Input
              {...fieldAria("email", error("email"))}
              type="email"
              value={values.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              dir="ltr"
              autoComplete="email"
            />
          </Field>
          <Field id="phone" label="Phone (optional)" error={error("phone")}>
            <Input
              {...fieldAria("phone", error("phone"))}
              type="tel"
              value={values.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              dir="ltr"
              autoComplete="tel"
              placeholder="+966 …"
            />
          </Field>
        </div>
        <div className="divide-y divide-border">
          <SwitchRow
            id="showEmail"
            label="Publish email address"
            checked={values.showEmail ?? false}
            onCheckedChange={(v) => set("showEmail", v)}
          />
          <SwitchRow
            id="showPhone"
            label="Publish phone number"
            checked={values.showPhone ?? false}
            onCheckedChange={(v) => set("showPhone", v)}
          />
          <SwitchRow
            id="showLocation"
            label="Publish location"
            description="Shows your location in the hero and contact section."
            checked={values.showLocation ?? false}
            onCheckedChange={(v) => set("showLocation", v)}
          />
        </div>
      </FormSection>

      <SaveBar dirty={form.dirty} pending={form.pending} onSave={() => void form.submit()} />
    </form>
  );
}
