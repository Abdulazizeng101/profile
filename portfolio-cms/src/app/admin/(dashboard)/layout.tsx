import { count, eq } from "drizzle-orm";
import { Eye, ExternalLink, LogOut } from "lucide-react";

import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";
import { requireAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import { contactMessages } from "@/server/db/schema";

// Reads the session and unread count per request; pages stream in behind loading.tsx.
export const instant = false;

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();
  const [unread] = await db
    .select({ n: count() })
    .from(contactMessages)
    .where(eq(contactMessages.status, "new"));

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar unread={unread?.n ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-[color-mix(in_oklab,var(--bg)_90%,transparent)] px-4 backdrop-blur-md md:px-6">
          <AdminMobileNav unread={unread?.n ?? 0} />
          <div className="ms-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" title="See drafts on the public site">
              <a href="/api/admin/preview?path=/en" target="_blank" rel="noopener">
                <Eye /> Preview drafts
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="/en" target="_blank" rel="noopener">
                <ExternalLink /> View site
              </a>
            </Button>
            <ThemeToggle labels={{ dark: "Switch to dark theme", light: "Switch to light theme" }} />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" title={`Signed in as ${session.user.email}`}>
                <LogOut /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
