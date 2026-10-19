"use client";

import { Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ImageUploader } from "@/components/admin/image-uploader";
import { FormSection } from "@/components/admin/page-header";
import { SortableList } from "@/components/admin/sortable-list";
import { useAction } from "@/components/admin/use-entity-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import type { ImageView } from "@/lib/types/media";
import {
  addProjectImage,
  removeProjectImage,
  reorderProjectImages,
  setProjectCover,
  updateProjectImage,
} from "@/server/actions/admin/projects";

type Img = {
  id: string;
  role: "gallery" | "diagram";
  captionEn: string;
  captionAr: string;
  isCover: boolean;
  image: ImageView;
};

export function ProjectImages({ projectId, images }: { projectId: string; images: Img[] }) {
  const router = useRouter();
  const [role, setRole] = useState<"gallery" | "diagram">("gallery");

  return (
    <FormSection
      title="Images"
      description="Screenshots appear in the gallery; the cover image is used on project cards. Diagrams appear in the Architecture part of the case study."
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="new-image-role" className="text-sm">
            Add as
          </label>
          <Select
            id="new-image-role"
            value={role}
            onChange={(e) => setRole(e.target.value as never)}
            className="w-48"
          >
            <option value="gallery">Screenshot</option>
            <option value="diagram">Architecture diagram</option>
          </Select>
        </div>
        <ImageUploader
          label={role === "gallery" ? "New screenshot" : "New diagram"}
          aspect="aspect-[16/10]"
          fit="contain"
          onUploaded={async (result) => {
            const added = await addProjectImage(projectId, result.id, role);
            if (added.ok) {
              toast.success("Image added.");
              router.refresh();
            } else toast.error(added.error);
          }}
        />
      </div>

      {images.length > 0 ? (
        <SortableList
          label="Project images"
          items={images}
          onReorder={(ids) => reorderProjectImages(projectId, ids)}
          renderItem={(img) => <ImageRow key={img.id + img.captionEn + img.captionAr + img.role} img={img} />}
        />
      ) : (
        <p className="text-sm text-subtle">No images yet. Add a screenshot to give the project a cover.</p>
      )}
    </FormSection>
  );
}

function ImageRow({ img }: { img: Img }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [values, setValues] = useState({
    captionEn: img.captionEn,
    captionAr: img.captionAr,
    role: img.role,
  });
  const dirty =
    values.captionEn !== img.captionEn || values.captionAr !== img.captionAr || values.role !== img.role;

  return (
    <div className="grid gap-3 py-1 md:grid-cols-[7rem_minmax(0,1fr)_auto] md:items-center">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] border border-border bg-surface-2">
        <img
          src={img.image.src}
          srcSet={img.image.srcSet}
          sizes="112px"
          alt=""
          className="h-full w-full object-cover"
        />
        {img.isCover ? (
          <Badge tone="accent" className="absolute start-1 top-1 px-1.5">
            Cover
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          aria-label="Caption (English)"
          placeholder="Caption (English)"
          value={values.captionEn}
          onChange={(e) => setValues((v) => ({ ...v, captionEn: e.target.value }))}
          maxLength={200}
          className="h-9"
        />
        <Input
          aria-label="Caption (Arabic)"
          placeholder="التعليق (اختياري)"
          value={values.captionAr}
          onChange={(e) => setValues((v) => ({ ...v, captionAr: e.target.value }))}
          maxLength={200}
          dir="rtl"
          lang="ar"
          className="h-9"
        />
        <Select
          aria-label="Image type"
          value={values.role}
          onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as "gallery" | "diagram" }))}
          className="h-9"
        >
          <option value="gallery">Screenshot</option>
          <option value="diagram">Architecture diagram</option>
        </Select>
        {dirty ? (
          <Button
            size="sm"
            variant="primary"
            className="h-9"
            disabled={pending}
            onClick={() =>
              run(
                () => updateProjectImage({ id: img.id, ...values }),
                () => router.refresh(),
              )
            }
          >
            Save image details
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {!img.isCover && img.role === "gallery" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () => setProjectCover(img.id),
                () => router.refresh(),
              )
            }
          >
            <Star /> Make cover
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remove image from project"
          disabled={pending}
          onClick={() =>
            run(
              () => removeProjectImage(img.id),
              () => router.refresh(),
            )
          }
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
