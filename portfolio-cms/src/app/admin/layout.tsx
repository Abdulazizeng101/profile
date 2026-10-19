import type { Metadata } from "next";
import { Toaster } from "sonner";

import "../globals.css";

import { fontVariables } from "@/app/fonts";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false, follow: false },
};

// Every admin page depends on the signed-in session, so it renders per request.
export const instant = false;

const themeScript = `(function(){try{var s=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",s==="light"?"light":"dark")}catch(e){}})()`;

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-theme="dark"
      data-accent="brass"
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh text-[0.9375rem]">
        {children}
        <Toaster
          // Top-right, so notifications never cover the sticky Save bar.
          position="top-right"
          offset={68}
          toastOptions={{
            classNames: {
              toast: "!bg-surface !text-fg !border-border-strong !rounded-[var(--radius)] !shadow-lg",
              description: "!text-muted",
              error: "!border-[color-mix(in_oklab,var(--danger)_45%,transparent)]",
              success: "!border-accent-line",
            },
          }}
        />
      </body>
    </html>
  );
}
