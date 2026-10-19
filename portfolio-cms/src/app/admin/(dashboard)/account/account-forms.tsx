"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAction, useEntityForm } from "@/components/admin/use-entity-form";
import { Button } from "@/components/ui/button";
import { Field, fieldAria, Input } from "@/components/ui/field";
import { changePassword, signOutOtherSessions } from "@/server/actions/auth";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function PasswordForm() {
  const router = useRouter();
  const [key, setKey] = useState(0);
  return (
    <PasswordFields
      key={key}
      onDone={() => {
        setKey((k) => k + 1);
        router.refresh();
      }}
    />
  );
}

function PasswordFields({ onDone }: { onDone: () => void }) {
  const form = useEntityForm(EMPTY, changePassword, { onSaved: onDone });
  const { values, set, error } = form;
  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <Field id="currentPassword" label="Current password" error={error("currentPassword")}>
        <Input
          {...fieldAria("currentPassword", error("currentPassword"))}
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(e) => set("currentPassword", e.target.value)}
        />
      </Field>
      <Field id="newPassword" label="New password" error={error("newPassword")}>
        <Input
          {...fieldAria("newPassword", error("newPassword"))}
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={values.newPassword}
          onChange={(e) => set("newPassword", e.target.value)}
        />
      </Field>
      <Field id="confirmPassword" label="Repeat new password" error={error("confirmPassword")}>
        <Input
          {...fieldAria("confirmPassword", error("confirmPassword"))}
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => set("confirmPassword", e.target.value)}
        />
      </Field>
      <div>
        <Button
          type="submit"
          variant="primary"
          disabled={form.pending || !values.currentPassword || !values.newPassword}
        >
          Change password
        </Button>
      </div>
    </form>
  );
}

export function SignOutOthers() {
  const router = useRouter();
  const { run, pending } = useAction();
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          run(
            () => signOutOtherSessions(),
            () => router.refresh(),
          )
        }
      >
        Sign out all other devices
      </Button>
    </div>
  );
}
