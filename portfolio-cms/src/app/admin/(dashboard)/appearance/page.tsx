import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getSettingsEditor } from "@/server/admin/queries";

import { AppearanceForm } from "./appearance-form";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const settings = await getSettingsEditor();
  return (
    <>
      <PageHeader
        title="Appearance"
        description="Theme, accent colour, which sections appear on the home page and in what order, and the buttons in the hero."
      />
      <AppearanceForm initial={settings.appearance} />
    </>
  );
}
