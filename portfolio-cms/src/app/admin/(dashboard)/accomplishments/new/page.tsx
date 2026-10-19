import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import type { AccomplishmentInput } from "@/lib/validation/content";

import { AccomplishmentEditor } from "../accomplishment-editor";

export const metadata: Metadata = { title: "Add certification or award" };

export default function NewAccomplishmentPage() {
  const initial: AccomplishmentInput = {
    status: "draft",
    kind: "certification",
    issuedOn: "",
    expiresOn: "",
    credentialId: "",
    credentialUrl: "",
    documentId: null,
    translations: {
      en: { title: "", issuer: "", description: "" },
      ar: { title: "", issuer: "", description: "" },
    },
  };
  return (
    <>
      <PageHeader
        title="Add certification, course or award"
        back={
          <Link href="/admin/accomplishments" className="link w-fit text-sm text-muted">
            All certifications & awards
          </Link>
        }
      />
      <AccomplishmentEditor entryId={null} initial={initial} document={null} />
    </>
  );
}
