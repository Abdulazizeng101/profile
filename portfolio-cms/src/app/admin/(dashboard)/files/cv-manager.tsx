"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DocumentUploader } from "@/components/admin/document-uploader";
import { FormSection } from "@/components/admin/page-header";
import type { DocumentView } from "@/lib/types/media";
import { setProfileMedia } from "@/server/actions/admin/profile";

export function CvManager({ cvEn, cvAr }: { cvEn: DocumentView | null; cvAr: DocumentView | null }) {
  const router = useRouter();

  async function apply(field: "cvEnId" | "cvArId", mediaId: string | null) {
    const result = await setProfileMedia({ field, mediaId });
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="grid gap-6">
      <FormSection
        title="CV (English)"
        description="Used on the English site, and on the Arabic site when there's no Arabic CV."
      >
        <DocumentUploader
          label="English CV"
          description="PDF only. Export it fresh from your editor for the smallest, cleanest file."
          current={cvEn}
          onUploaded={(result) => apply("cvEnId", result.id)}
          onRemove={() => apply("cvEnId", null)}
        />
        <p className="text-xs text-subtle">
          Public link: <code className="text-muted">/cv</code>
        </p>
      </FormSection>
      <FormSection title="CV (Arabic, optional)">
        <DocumentUploader
          label="Arabic CV"
          current={cvAr}
          onUploaded={(result) => apply("cvArId", result.id)}
          onRemove={() => apply("cvArId", null)}
        />
        <p className="text-xs text-subtle">
          Public link: <code className="text-muted">/cv?lang=ar</code>
        </p>
      </FormSection>
      <p className="text-sm text-subtle">
        Certificates and other documents are attached to their entries in Certifications & awards. Old files
        stay in the media library until you delete them.
      </p>
    </div>
  );
}
