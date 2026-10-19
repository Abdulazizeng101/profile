import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="grid w-full max-w-sm gap-8">
        <div className="grid gap-2">
          <span aria-hidden="true" className="crop-marks relative size-6" />
          <h1 className="heading mt-3 text-2xl">Sign in to your dashboard</h1>
          <p className="text-sm text-muted">Manage the content of your portfolio.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
