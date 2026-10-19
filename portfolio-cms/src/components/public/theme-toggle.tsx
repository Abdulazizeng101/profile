"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Both icons are rendered and CSS shows the one for the theme you'd switch to,
 * so the server and client markup are identical (no hydration mismatch).
 */
export function ThemeToggle({ labels }: { labels: { dark: string; light: string } }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage unavailable (private mode): the choice lasts for this page only.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="group inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Sun className="size-[18px] [[data-theme=light]_&]:hidden" strokeWidth={1.75} aria-hidden="true" />
      <Moon
        className="hidden size-[18px] [[data-theme=light]_&]:block"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="sr-only [[data-theme=light]_&]:hidden">{labels.light}</span>
      <span className="sr-only hidden [[data-theme=light]_&]:inline">{labels.dark}</span>
    </button>
  );
}
