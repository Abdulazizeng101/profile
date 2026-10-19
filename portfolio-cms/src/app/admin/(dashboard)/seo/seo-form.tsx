"use client";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { ImageField } from "@/components/admin/media-field";
import { FormSection } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { useEntityForm } from "@/components/admin/use-entity-form";
import { Field, fieldAria, Input, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import type { ImageView } from "@/lib/types/media";
import { saveSeo } from "@/server/actions/admin/settings";

type Values = {
  allowIndexing: boolean;
  ogImageId: string | null;
  translations: Record<"en" | "ar", { siteTitle: string; metaDescription: string }>;
};

export function SeoForm({ initial, ogImage }: { initial: Values; ogImage: ImageView | null }) {
  const form = useEntityForm(initial, saveSeo);
  const { values, set, error } = form;

  return (
    <form
      className="grid gap-6 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <FormSection title="Search engine visibility">
        <SwitchRow
          id="allowIndexing"
          label="Allow search engines to index the site"
          description="Off by default so a half-finished site doesn't appear in Google. Turn it on once your content is ready; the sitemap is published at the same time."
          checked={values.allowIndexing}
          onCheckedChange={(v) => set("allowIndexing", v)}
        />
      </FormSection>

      <FormSection
        title="Home page title and description"
        description="Leave empty to use “Your name — your title” and your introduction."
      >
        <LocaleTabs errors={form.errors} arabicFilled={Boolean(values.translations.ar.siteTitle)}>
          {(locale) => {
            const p = `translations.${locale}`;
            const dir = locale === "ar" ? "rtl" : "ltr";
            const description = values.translations[locale].metaDescription;
            return (
              <>
                <Field
                  id={`${p}.siteTitle`}
                  label="Page title"
                  hint="About 50–60 characters."
                  error={error(`${p}.siteTitle`)}
                >
                  <Input
                    {...fieldAria(`${p}.siteTitle`, error(`${p}.siteTitle`), true)}
                    value={values.translations[locale].siteTitle}
                    onChange={(e) => set(`${p}.siteTitle`, e.target.value)}
                    dir={dir}
                    maxLength={70}
                  />
                </Field>
                <Field
                  id={`${p}.metaDescription`}
                  label="Meta description"
                  hint={`${description.length}/160 characters recommended.`}
                  error={error(`${p}.metaDescription`)}
                >
                  <Textarea
                    {...fieldAria(`${p}.metaDescription`, error(`${p}.metaDescription`), true)}
                    value={description}
                    onChange={(e) => set(`${p}.metaDescription`, e.target.value)}
                    dir={dir}
                    rows={3}
                    maxLength={200}
                  />
                </Field>
              </>
            );
          }}
        </LocaleTabs>
      </FormSection>

      <FormSection
        title="Social sharing image"
        description="Shown when your home page link is shared. 1200 × 630 px works everywhere. Without one, your profile photo is used."
      >
        <ImageField
          label="Sharing image"
          value={values.ogImageId}
          initialView={ogImage}
          onChange={(id) => set("ogImageId", id)}
          aspect="aspect-[1200/630]"
          fit="cover"
          askAlt
          compact={false}
        />
      </FormSection>

      <SaveBar dirty={form.dirty} pending={form.pending} onSave={() => void form.submit()} />
    </form>
  );
}
