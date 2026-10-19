import { Download } from "lucide-react";
import type { Metadata } from "next";

import { FormSection, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

import { RefreshPublicSiteButton } from "./refresh-button";

export const metadata: Metadata = { title: "Backup & export" };

const code = "rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.8125rem] text-fg";

export default function BackupPage() {
  return (
    <>
      <PageHeader
        title="Backup & export"
        description="Keep your own copy of everything on the site. Step-by-step instructions are in docs/BACKUP.md in the project."
      />
      <div className="grid gap-6">
        <FormSection
          title="Quick export"
          description="Downloads all text, settings, links and messages as one JSON file. Passwords and sign-in sessions are never included. Uploaded files are referenced, not included."
        >
          <div>
            <Button asChild variant="primary">
              <a href="/api/admin/export" download>
                <Download /> Download content export
              </a>
            </Button>
          </div>
        </FormSection>

        <FormSection
          title="Complete backup (recommended monthly)"
          description="Run these from the project folder on your computer, with the production DATABASE_URL and storage settings in .env.local."
        >
          <ul className="grid gap-3 text-sm text-muted">
            <li>
              <span className="text-fg">Content and files:</span>{" "}
              <code className={code}>pnpm content:export</code> writes a folder with all content plus every
              photo, screenshot and CV, from local storage or your R2 bucket.
            </li>
            <li>
              <span className="text-fg">Whole database:</span>{" "}
              <code className={code}>./scripts/backup.sh</code> makes a <code className={code}>pg_dump</code>{" "}
              snapshot. Your database host may also keep short-term history, depending on the plan.
            </li>
          </ul>
        </FormSection>

        <FormSection
          title="Restoring"
          description="Restores are command-line steps on purpose, so a mistaken click can't overwrite your live site."
        >
          <ul className="grid gap-3 text-sm text-muted">
            <li>
              <code className={code}>pnpm content:import &lt;folder or .json&gt;</code> shows what will
              change, asks you to type REPLACE, and swaps all content in one transaction. Your admin account
              is kept.
            </li>
            <li>
              <code className={code}>./scripts/restore.sh &lt;file.dump&gt;</code> restores a full database
              snapshot.
            </li>
          </ul>
          <div className="grid gap-2 border-t border-border pt-4">
            <p className="text-sm text-muted">
              After a restore, refresh the public site so visitors see the restored content straight away.
              Saving in the dashboard already does this for you.
            </p>
            <div>
              <RefreshPublicSiteButton />
            </div>
          </div>
        </FormSection>
      </div>
    </>
  );
}
