"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

export function MobileNav({
  links,
  labels,
}: {
  links: { href: string; label: string }[];
  labels: { open: string; close: string; nav: string };
}) {
  const [open, setOpen] = useState(false);
  if (links.length === 0) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
        aria-label={labels.open}
      >
        <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 end-0 z-50 flex w-[min(20rem,85vw)] flex-col border-s border-border bg-bg p-5 data-[state=open]:animate-in data-[state=open]:slide-in-from-right-8 rtl:data-[state=open]:slide-in-from-left-8"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-sm text-subtle">{labels.nav}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted hover:bg-surface-2 hover:text-fg"
              aria-label={labels.close}
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <nav aria-label={labels.nav} className="mt-6">
            <ul className="grid gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="heading block rounded-[var(--radius)] px-3 py-2.5 text-xl hover:bg-surface-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
