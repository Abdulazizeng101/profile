import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/session";

/**
 * Opens a public page with drafts visible (Draft Mode), for the signed-in
 * admin only. Used by the "Preview" buttons, which open it in a new tab.
 * The target must be a local, locale-prefixed path, so this can't be used
 * as an open redirect.
 */
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");
  const path = new URL(request.url).searchParams.get("path") ?? "/en";
  const safe = /^\/(en|ar)(\/[a-z0-9-]+)*\/?$/.test(path) ? path : "/en";
  (await draftMode()).enable();
  redirect(safe);
}
