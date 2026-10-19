"use client";

import { EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/admin/page-header";
import { SortableList } from "@/components/admin/sortable-list";
import { useAction } from "@/components/admin/use-entity-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldAria, Input, Select } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import type { FieldErrors } from "@/lib/action-result";
import {
  deleteSkill,
  deleteSkillCategory,
  reorderSkillCategories,
  reorderSkills,
  saveSkill,
  saveSkillCategory,
} from "@/server/actions/admin/skills";

type Skill = {
  id: string;
  name: string;
  nameAr: string;
  categoryId: string | null;
  iconSlug: string;
  iconPath: string;
  proficiency: "learning" | "familiar" | "proficient" | "advanced" | null;
  isVisible: boolean;
  projectCount: number;
};
type Category = { id: string; nameEn: string; nameAr: string; isVisible: boolean; skills: Skill[] };

const PROFICIENCY: Record<string, string> = {
  learning: "Learning",
  familiar: "Familiar",
  proficient: "Proficient",
  advanced: "Advanced",
};

type SkillDraft = Omit<Skill, "id" | "iconPath" | "projectCount">;

export function SkillsManager({
  categories,
  uncategorized,
}: {
  categories: Category[];
  uncategorized: Skill[];
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [skillDialog, setSkillDialog] = useState<{ id: string | null; values: SkillDraft } | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{
    id: string | null;
    nameEn: string;
    nameAr: string;
    isVisible: boolean;
  } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    label: string;
    action: () => void;
  } | null>(null);

  const newSkill = (categoryId: string | null): SkillDraft => ({
    name: "",
    nameAr: "",
    categoryId,
    iconSlug: "",
    proficiency: null,
    isVisible: true,
  });

  function saveSkillDialog() {
    if (!skillDialog) return;
    run(
      async () => {
        const result = await saveSkill(skillDialog.id, skillDialog.values);
        if (!result.ok) setErrors(result.fieldErrors ?? {});
        return result;
      },
      () => {
        setSkillDialog(null);
        router.refresh();
      },
    );
  }

  function saveCategoryDialog() {
    if (!categoryDialog) return;
    const { id, ...values } = categoryDialog;
    run(
      async () => {
        const result = await saveSkillCategory(id, values);
        if (!result.ok) setErrors(result.fieldErrors ?? {});
        return result;
      },
      () => {
        setCategoryDialog(null);
        router.refresh();
      },
    );
  }

  const skillRows = (list: Skill[]) =>
    list.length === 0 ? (
      <p className="text-sm text-subtle">No skills in this category.</p>
    ) : (
      <SortableList
        label="Skills"
        items={list}
        onReorder={reorderSkills}
        renderItem={(skill) => (
          <div className="flex items-center gap-3">
            <span className="flex size-5 items-center justify-center text-muted">
              {skill.iconPath ? (
                <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                  <path d={skill.iconPath} />
                </svg>
              ) : null}
            </span>
            <span className="flex-1 text-sm">
              {skill.name}
              {skill.nameAr ? (
                <span className="ms-2 text-subtle" lang="ar">
                  {skill.nameAr}
                </span>
              ) : null}
            </span>
            {skill.proficiency ? <Badge>{PROFICIENCY[skill.proficiency]}</Badge> : null}
            {!skill.isVisible ? (
              <Badge>
                <EyeOff className="size-3" /> Hidden
              </Badge>
            ) : null}
            {skill.projectCount ? (
              <span className="text-xs text-subtle">
                {skill.projectCount === 1 ? "1 project" : `${skill.projectCount} projects`}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${skill.name}`}
              onClick={() => {
                setErrors({});
                setSkillDialog({
                  id: skill.id,
                  values: {
                    name: skill.name,
                    nameAr: skill.nameAr,
                    categoryId: skill.categoryId,
                    iconSlug: skill.iconSlug,
                    proficiency: skill.proficiency,
                    isVisible: skill.isVisible,
                  },
                });
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${skill.name}`}
              onClick={() =>
                setConfirm({
                  title: `Delete “${skill.name}”?`,
                  description: skill.projectCount
                    ? `It's also removed from the ${skill.projectCount} project(s) that list it as a technology.`
                    : "This removes the skill from your site.",
                  label: "Delete skill",
                  action: () =>
                    run(
                      () => deleteSkill(skill.id),
                      () => router.refresh(),
                    ),
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        )}
      />
    );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => {
            setErrors({});
            setSkillDialog({ id: null, values: newSkill(categories[0]?.id ?? null) });
          }}
        >
          <Plus /> Add skill
        </Button>
        <Button
          onClick={() => {
            setErrors({});
            setCategoryDialog({ id: null, nameEn: "", nameAr: "", isVisible: true });
          }}
        >
          <Plus /> Add category
        </Button>
      </div>

      <FormSection
        title="Categories"
        description="Drag to change the order of categories on the site. Categories without visible skills are hidden."
      >
        <SortableList
          label="Skill categories"
          items={categories}
          onReorder={reorderSkillCategories}
          renderItem={(c) => (
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium">
                {c.nameEn}
                {c.nameAr ? (
                  <span className="ms-2 font-normal text-subtle" lang="ar">
                    {c.nameAr}
                  </span>
                ) : null}
              </span>
              {!c.isVisible ? <Badge>Hidden</Badge> : null}
              <span className="text-xs text-subtle">
                {c.skills.length === 1 ? "1 skill" : `${c.skills.length} skills`}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${c.nameEn}`}
                onClick={() => {
                  setErrors({});
                  setCategoryDialog({ id: c.id, nameEn: c.nameEn, nameAr: c.nameAr, isVisible: c.isVisible });
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${c.nameEn}`}
                onClick={() =>
                  setConfirm({
                    title: `Delete “${c.nameEn}”?`,
                    description: "Its skills aren't deleted; they move to Uncategorized.",
                    label: "Delete category",
                    action: () =>
                      run(
                        () => deleteSkillCategory(c.id),
                        () => router.refresh(),
                      ),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          )}
        />
      </FormSection>

      {categories.map((c) => (
        <FormSection
          key={c.id}
          title={c.nameEn}
          aside={
            <Button
              size="sm"
              onClick={() => {
                setErrors({});
                setSkillDialog({ id: null, values: newSkill(c.id) });
              }}
            >
              <Plus /> Add skill
            </Button>
          }
        >
          {skillRows(c.skills)}
        </FormSection>
      ))}

      {uncategorized.length > 0 ? (
        <FormSection
          title="Uncategorized"
          description="Not shown in the Skills section until you give them a category. Still usable as technology tags."
        >
          {skillRows(uncategorized)}
        </FormSection>
      ) : null}

      <Dialog open={skillDialog !== null} onOpenChange={(o) => !o && setSkillDialog(null)}>
        <DialogContent title={skillDialog?.id ? "Edit skill" : "Add skill"}>
          {skillDialog ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveSkillDialog();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="skill-name" label="Name" required error={errors.name?.[0]}>
                  <Input
                    {...fieldAria("skill-name", errors.name)}
                    autoFocus
                    value={skillDialog.values.name}
                    onChange={(e) =>
                      setSkillDialog((d) => d && { ...d, values: { ...d.values, name: e.target.value } })
                    }
                  />
                </Field>
                <Field
                  id="skill-nameAr"
                  label="Arabic name (optional)"
                  hint="Only if it differs, e.g. for concepts."
                  error={errors.nameAr?.[0]}
                >
                  <Input
                    {...fieldAria("skill-nameAr", errors.nameAr, true)}
                    dir="rtl"
                    lang="ar"
                    value={skillDialog.values.nameAr}
                    onChange={(e) =>
                      setSkillDialog((d) => d && { ...d, values: { ...d.values, nameAr: e.target.value } })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="skill-category" label="Category">
                  <Select
                    id="skill-category"
                    value={skillDialog.values.categoryId ?? ""}
                    onChange={(e) =>
                      setSkillDialog(
                        (d) => d && { ...d, values: { ...d.values, categoryId: e.target.value || null } },
                      )
                    }
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="skill-proficiency" label="Proficiency label (optional)">
                  <Select
                    id="skill-proficiency"
                    value={skillDialog.values.proficiency ?? ""}
                    onChange={(e) =>
                      setSkillDialog(
                        (d) =>
                          d && {
                            ...d,
                            values: {
                              ...d.values,
                              proficiency: (e.target.value || null) as SkillDraft["proficiency"],
                            },
                          },
                      )
                    }
                  >
                    <option value="">None</option>
                    <option value="learning">Learning</option>
                    <option value="familiar">Familiar</option>
                    <option value="proficient">Proficient</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </Field>
              </div>
              <Field
                id="skill-icon"
                label="Icon (optional)"
                hint="A Simple Icons slug, e.g. typescript, react, postgresql, docker. Find slugs at simpleicons.org."
                error={errors.iconSlug?.[0]}
              >
                <Input
                  {...fieldAria("skill-icon", errors.iconSlug, true)}
                  dir="ltr"
                  value={skillDialog.values.iconSlug}
                  onChange={(e) =>
                    setSkillDialog((d) => d && { ...d, values: { ...d.values, iconSlug: e.target.value } })
                  }
                />
              </Field>
              <SwitchRow
                id="skill-visible"
                label="Show in the Skills section"
                checked={skillDialog.values.isVisible}
                onCheckedChange={(v) =>
                  setSkillDialog((d) => d && { ...d, values: { ...d.values, isVisible: v } })
                }
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSkillDialog(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={pending}>
                  Save skill
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialog !== null} onOpenChange={(o) => !o && setCategoryDialog(null)}>
        <DialogContent title={categoryDialog?.id ? "Edit category" : "Add category"}>
          {categoryDialog ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveCategoryDialog();
              }}
            >
              <Field id="cat-en" label="Name (English)" required error={errors.nameEn?.[0]}>
                <Input
                  {...fieldAria("cat-en", errors.nameEn)}
                  autoFocus
                  value={categoryDialog.nameEn}
                  onChange={(e) => setCategoryDialog((d) => d && { ...d, nameEn: e.target.value })}
                />
              </Field>
              <Field id="cat-ar" label="Name (Arabic)" error={errors.nameAr?.[0]}>
                <Input
                  {...fieldAria("cat-ar", errors.nameAr)}
                  dir="rtl"
                  lang="ar"
                  value={categoryDialog.nameAr}
                  onChange={(e) => setCategoryDialog((d) => d && { ...d, nameAr: e.target.value })}
                />
              </Field>
              <SwitchRow
                id="cat-visible"
                label="Show this category on the site"
                checked={categoryDialog.isVisible}
                onCheckedChange={(v) => setCategoryDialog((d) => d && { ...d, isVisible: v })}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCategoryDialog(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={pending}>
                  Save category
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.label ?? "Delete"}
        onConfirm={() => confirm?.action()}
      />
    </div>
  );
}
