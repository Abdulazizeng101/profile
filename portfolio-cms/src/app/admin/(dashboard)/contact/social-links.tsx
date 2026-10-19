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
import { SOCIAL_PLATFORMS } from "@/lib/validation/content";
import { deleteSocialLink, reorderSocialLinks, saveSocialLink } from "@/server/actions/admin/social";

const NAMES: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  gitlab: "GitLab",
  stackoverflow: "Stack Overflow",
  medium: "Medium",
  devto: "DEV",
  leetcode: "LeetCode",
  kaggle: "Kaggle",
  youtube: "YouTube",
  website: "Personal website",
  other: "Other",
};

type Link = {
  id: string;
  platform: (typeof SOCIAL_PLATFORMS)[number];
  label: string;
  url: string;
  showInHero: boolean;
  showInContact: boolean;
  showInFooter: boolean;
  isVisible: boolean;
};

type Draft = Omit<Link, "id">;

const EMPTY: Draft = {
  platform: "github",
  label: "",
  url: "",
  showInHero: true,
  showInContact: true,
  showInFooter: true,
  isVisible: true,
};

export function SocialLinksManager({ links }: { links: Link[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [dialog, setDialog] = useState<{ id: string | null; values: Draft } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [deleting, setDeleting] = useState<Link | null>(null);

  const update = (patch: Partial<Draft>) =>
    setDialog((d) => d && { ...d, values: { ...d.values, ...patch } });

  return (
    <FormSection
      title="Professional profiles"
      description="Choose where each link appears. Drag to set the order."
      aside={
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setErrors({});
            setDialog({ id: null, values: { ...EMPTY } });
          }}
        >
          <Plus /> Add link
        </Button>
      }
    >
      {links.length === 0 ? (
        <p className="text-sm text-subtle">
          No links yet. GitHub and LinkedIn are the two recruiters look for first.
        </p>
      ) : (
        <SortableList
          label="Profile links"
          items={links}
          onReorder={reorderSocialLinks}
          renderItem={(link) => (
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid min-w-0 flex-[1_1_12rem] gap-0.5">
                <span className="text-sm font-medium">{link.label || NAMES[link.platform]}</span>
                <span className="truncate text-xs text-subtle" dir="ltr">
                  {link.url}
                </span>
              </div>
              {!link.isVisible ? (
                <Badge>
                  <EyeOff className="size-3" /> Hidden
                </Badge>
              ) : (
                <span className="text-xs text-subtle">
                  {[link.showInHero && "Hero", link.showInContact && "Contact", link.showInFooter && "Footer"]
                    .filter(Boolean)
                    .join(", ") || "Not placed"}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${link.label || NAMES[link.platform]}`}
                onClick={() => {
                  setErrors({});
                  const { id, ...values } = link;
                  setDialog({ id, values });
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${link.label || NAMES[link.platform]}`}
                onClick={() => setDeleting(link)}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        />
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent title={dialog?.id ? "Edit link" : "Add link"}>
          {dialog ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  async () => {
                    const result = await saveSocialLink(dialog.id, dialog.values);
                    if (!result.ok) setErrors(result.fieldErrors ?? {});
                    return result;
                  },
                  () => {
                    setDialog(null);
                    router.refresh();
                  },
                );
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="link-platform" label="Platform">
                  <Select
                    id="link-platform"
                    value={dialog.values.platform}
                    onChange={(e) => update({ platform: e.target.value as Draft["platform"] })}
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {NAMES[p]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  id="link-label"
                  label="Label (optional)"
                  hint={`Defaults to “${NAMES[dialog.values.platform]}”.`}
                  error={errors.label?.[0]}
                >
                  <Input
                    {...fieldAria("link-label", errors.label, true)}
                    value={dialog.values.label}
                    onChange={(e) => update({ label: e.target.value })}
                    maxLength={40}
                  />
                </Field>
              </div>
              <Field id="link-url" label="URL" required error={errors.url?.[0]}>
                <Input
                  {...fieldAria("link-url", errors.url)}
                  type="url"
                  dir="ltr"
                  autoFocus
                  value={dialog.values.url}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="https://github.com/your-username"
                />
              </Field>
              <div className="divide-y divide-border">
                <SwitchRow
                  id="link-visible"
                  label="Show on the site"
                  checked={dialog.values.isVisible}
                  onCheckedChange={(v) => update({ isVisible: v })}
                />
                <SwitchRow
                  id="link-hero"
                  label="In the hero"
                  checked={dialog.values.showInHero}
                  onCheckedChange={(v) => update({ showInHero: v })}
                  disabled={!dialog.values.isVisible}
                />
                <SwitchRow
                  id="link-contact"
                  label="In the contact section"
                  checked={dialog.values.showInContact}
                  onCheckedChange={(v) => update({ showInContact: v })}
                  disabled={!dialog.values.isVisible}
                />
                <SwitchRow
                  id="link-footer"
                  label="In the footer"
                  checked={dialog.values.showInFooter}
                  onCheckedChange={(v) => update({ showInFooter: v })}
                  disabled={!dialog.values.isVisible}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={pending}>
                  Save link
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this link?"
        description="It's removed from every place on the site."
        confirmLabel="Delete link"
        onConfirm={() =>
          deleting &&
          run(
            () => deleteSocialLink(deleting.id),
            () => router.refresh(),
          )
        }
      />
    </FormSection>
  );
}
