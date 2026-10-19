"use client";

import {
  Award,
  BookOpen,
  Briefcase,
  FileText,
  FolderKanban,
  GraduationCap,
  Image as ImageIcon,
  Inbox,
  Languages,
  LayoutDashboard,
  Link2,
  Menu,
  Palette,
  Search,
  Shield,
  User,
  Wrench,
  X,
  DatabaseBackup,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";

import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }>; badge?: number };

function groups(unread: number): { label: string; items: Item[] }[] {
  return [
    { label: "", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
    {
      label: "Content",
      items: [
        { href: "/admin/profile", label: "Profile", icon: User },
        { href: "/admin/about", label: "About me", icon: BookOpen },
        { href: "/admin/projects", label: "Projects", icon: FolderKanban },
        { href: "/admin/skills", label: "Skills", icon: Wrench },
        { href: "/admin/experience", label: "Experience", icon: Briefcase },
        { href: "/admin/education", label: "Education", icon: GraduationCap },
        { href: "/admin/accomplishments", label: "Certifications & awards", icon: Award },
      ],
    },
    {
      label: "Files",
      items: [
        { href: "/admin/media", label: "Photo & media", icon: ImageIcon },
        { href: "/admin/files", label: "CV & documents", icon: FileText },
      ],
    },
    {
      label: "Contact",
      items: [
        { href: "/admin/contact", label: "Links & contact", icon: Link2 },
        { href: "/admin/messages", label: "Messages", icon: Inbox, badge: unread },
      ],
    },
    {
      label: "Site",
      items: [
        { href: "/admin/appearance", label: "Appearance", icon: Palette },
        { href: "/admin/seo", label: "SEO", icon: Search },
        { href: "/admin/languages", label: "Languages", icon: Languages },
        { href: "/admin/backup", label: "Backup & export", icon: DatabaseBackup },
        { href: "/admin/account", label: "Account & security", icon: Shield },
      ],
    },
  ];
}

function NavList({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <nav aria-label="Dashboard" className="grid gap-5">
      {groups(unread).map((group, index) => (
        <div key={group.label || index} className="grid gap-0.5">
          {group.label ? <p className="px-3 pb-1 text-xs text-subtle">{group.label}</p> : null}
          {group.items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                <Icon className={cn("size-4", active ? "text-accent" : "text-subtle")} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-accent px-1.5 text-2xs font-semibold text-accent-fg">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({ unread }: { unread: number }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-e border-border bg-surface px-3 py-5 lg:block">
      <Link href="/admin" className="mb-6 flex items-center gap-2 px-3">
        <span aria-hidden="true" className="crop-marks crop-marks-sm relative size-3.5" />
        <span className="heading ms-1 text-sm font-semibold">Portfolio dashboard</span>
      </Link>
      <NavList unread={unread} />
    </aside>
  );
}

export function AdminMobileNav({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted hover:bg-surface-2"
        aria-label="Open dashboard menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-72 overflow-y-auto border-e border-border bg-surface px-3 py-4">
            <div className="mb-4 flex items-center justify-between px-3">
              <span className="heading text-sm font-semibold">Portfolio dashboard</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted hover:bg-surface-2"
                aria-label="Close dashboard menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavList unread={unread} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
