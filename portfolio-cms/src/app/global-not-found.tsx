import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/** Served for URLs that match no route at all. */
export default function GlobalNotFound() {
  return (
    <html lang="en" data-theme="dark" className={fontVariables}>
      <body className="grid min-h-dvh place-items-center px-6">
        <main className="grid max-w-md gap-4 text-center">
          <p className="display text-7xl text-subtle">404</p>
          <h1 className="heading text-2xl">Page not found</h1>
          <p className="text-muted">This page doesn’t exist or was moved.</p>
          <p className="flex justify-center gap-4 pt-2 text-sm">
            <Link href="/en" className="link">
              Go to the home page
            </Link>
            <Link href="/ar" className="link" lang="ar">
              الصفحة الرئيسية
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
