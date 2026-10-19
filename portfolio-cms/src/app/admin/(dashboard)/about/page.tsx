import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getProfileEditor } from "@/server/admin/queries";

import { AboutForm } from "./about-form";

export const metadata: Metadata = { title: "About me" };

export default async function AboutPage() {
  const data = await getProfileEditor();
  return (
    <>
      <PageHeader
        title="About me"
        description="Your story for recruiters: background, interests, goals and the kind of engineering you want to do. Written in Markdown. Empty fields are simply left out."
      />
      <AboutForm initial={data.about} />
    </>
  );
}
