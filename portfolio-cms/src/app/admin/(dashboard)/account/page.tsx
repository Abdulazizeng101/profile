import type { Metadata } from "next";

import { FormSection, PageHeader } from "@/components/admin/page-header";
import { listSessions } from "@/server/auth/session";
import { requireAdmin } from "@/server/auth/guard";

import { PasswordForm, SignOutOthers } from "./account-forms";

export const metadata: Metadata = { title: "Account & security" };

function describeAgent(ua: string): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

export default async function AccountPage() {
  const session = await requireAdmin();
  const sessions = await listSessions(session.user.id);

  return (
    <>
      <PageHeader title="Account & security" description={`Signed in as ${session.user.email}.`} />
      <div className="grid gap-6">
        <FormSection
          title="Change password"
          description="At least 12 characters. A password manager makes this easy. Changing it signs out your other devices."
        >
          <PasswordForm />
        </FormSection>
        <FormSection
          title="Signed-in devices"
          description="Sessions expire after 7 days without use, and after 30 days at most."
        >
          <ul className="grid divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span>
                  {describeAgent(s.userAgent)}
                  {s.id === session.sessionId ? (
                    <span className="ms-2 text-xs text-accent">This device</span>
                  ) : null}
                </span>
                <span className="text-xs text-subtle">
                  Signed in{" "}
                  {s.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
          {sessions.length > 1 ? <SignOutOthers /> : null}
        </FormSection>
        <FormSection
          title="Forgotten password"
          description="There is no email reset link, by design. Reset the password from your computer with the project's CLI."
        >
          <pre className="overflow-x-auto rounded-[var(--radius)] bg-surface-2 p-3 text-xs">
            pnpm admin:reset-password
          </pre>
        </FormSection>
      </div>
    </>
  );
}
