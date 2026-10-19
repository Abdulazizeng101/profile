import type { Metadata } from "next";
import Link from "next/link";

import { FormSection, PageHeader } from "@/components/admin/page-header";
import { getOverview, getSettingsEditor } from "@/server/admin/queries";

import { LanguageForm } from "./language-form";

export const metadata: Metadata = { title: "Languages" };

export default async function LanguagesPage() {
  const [settings, overview] = await Promise.all([getSettingsEditor(), getOverview()]);
  return (
    <>
      <PageHeader
        title="Languages"
        description="English is the default language of the site. The Arabic version (/ar) has its own right-to-left layout and uses the Arabic text you enter in each editor."
      />
      <div className="grid gap-6">
        <LanguageForm initial={settings.localization} />
        <FormSection title="Arabic coverage" description="Published items that don't have Arabic text yet.">
          {overview.missingArabic.length === 0 ? (
            <p className="text-sm text-subtle">Everything published has Arabic text.</p>
          ) : (
            <ul className="grid gap-1">
              {overview.missingArabic.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className="link text-sm">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </FormSection>
      </div>
    </>
  );
}
