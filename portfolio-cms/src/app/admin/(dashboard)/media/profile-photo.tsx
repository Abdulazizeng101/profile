"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ImageUploader } from "@/components/admin/image-uploader";
import { FormSection } from "@/components/admin/page-header";
import type { ImageView } from "@/lib/types/media";
import { setProfileMedia } from "@/server/actions/admin/profile";

export function ProfilePhoto({
  current,
}: {
  current: (ImageView & { altEn: string; altAr: string }) | null;
}) {
  const router = useRouter();

  async function apply(mediaId: string | null) {
    const result = await setProfileMedia({ field: "photoId", mediaId });
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <FormSection
      title="Profile photo"
      description="Shown in the hero section. A portrait (4:5) photo with your face in the upper half works best. Use a real, recent photo of yourself."
    >
      <ImageUploader
        label={current ? "Current photo" : "No photo yet"}
        description="Alt text describes the photo for screen readers, e.g. “Portrait of [your name]”."
        current={current}
        aspect="aspect-[4/5]"
        onUploaded={(result) => apply(result.id)}
        onRemove={() => apply(null)}
      />
    </FormSection>
  );
}
