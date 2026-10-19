"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/admin/page-header";
import { useAction } from "@/components/admin/use-entity-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldAria, Input } from "@/components/ui/field";
import type { FieldErrors } from "@/lib/action-result";
import { slugify } from "@/lib/utils";
import { deleteProjectCategory, saveProjectCategory } from "@/server/actions/admin/projects";

type Category = { id: string; slug: string; nameEn: string; nameAr: string };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [values, setValues] = useState({ nameEn: "", nameAr: "", slug: "" });
  const [errors, setErrors] = useState<FieldErrors>({});

  function open(category: Category | "new") {
    setEditing(category);
    setErrors({});
    setValues(category === "new" ? { nameEn: "", nameAr: "", slug: "" } : { ...category });
  }

  function save() {
    const id = editing === "new" || editing === null ? null : editing.id;
    run(
      async () => {
        const result = await saveProjectCategory(id, {
          ...values,
          slug: values.slug || slugify(values.nameEn),
        });
        if (!result.ok) setErrors(result.fieldErrors ?? {});
        return result;
      },
      () => {
        setEditing(null);
        router.refresh();
      },
    );
  }

  return (
    <FormSection
      title="Project categories"
      description="Used to group and filter projects on the Projects page."
      aside={
        <Button size="sm" onClick={() => open("new")}>
          <Plus /> Add category
        </Button>
      }
    >
      {categories.length === 0 ? (
        <p className="text-sm text-subtle">No categories yet.</p>
      ) : (
        <ul className="grid divide-y divide-border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="flex flex-1 flex-wrap items-baseline gap-x-2.5 text-sm">
                <span>{c.nameEn}</span>
                {c.nameAr ? (
                  <span className="text-subtle" lang="ar" dir="rtl">
                    {c.nameAr}
                  </span>
                ) : null}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => open(c)} aria-label={`Edit ${c.nameEn}`}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleting(c)}
                aria-label={`Delete ${c.nameEn}`}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "New category" : "Edit category"}>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field id="cat-nameEn" label="Name (English)" required error={errors.nameEn?.[0]}>
              <Input
                {...fieldAria("cat-nameEn", errors.nameEn)}
                value={values.nameEn}
                onChange={(e) => setValues((v) => ({ ...v, nameEn: e.target.value }))}
                autoFocus
              />
            </Field>
            <Field id="cat-nameAr" label="Name (Arabic)" error={errors.nameAr?.[0]}>
              <Input
                {...fieldAria("cat-nameAr", errors.nameAr)}
                value={values.nameAr}
                onChange={(e) => setValues((v) => ({ ...v, nameAr: e.target.value }))}
                dir="rtl"
                lang="ar"
              />
            </Field>
            <Field
              id="cat-slug"
              label="URL value"
              hint="Used in filter links. Leave empty to generate it."
              error={errors.slug?.[0]}
            >
              <Input
                {...fieldAria("cat-slug", errors.slug, true)}
                value={values.slug}
                onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
                placeholder={slugify(values.nameEn) || "web"}
                dir="ltr"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={pending}>
                Save category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.nameEn}”?`}
        description="Projects in this category keep their content and simply have no category."
        confirmLabel="Delete category"
        onConfirm={() =>
          deleting &&
          run(
            () => deleteProjectCategory(deleting.id),
            () => router.refresh(),
          )
        }
      />
    </FormSection>
  );
}
