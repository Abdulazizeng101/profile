import { connection } from "next/server";

import { isLocale } from "@/lib/i18n/config";
import { getCurrentCvUrl } from "@/server/content/public";

/**
 * Stable CV link: /cv (English) or /cv?lang=ar. Always redirects to the CV
 * currently published in the dashboard, so links in emails and printed
 * material never go stale.
 */
export async function GET(request: Request) {
  await connection();
  const lang = new URL(request.url).searchParams.get("lang");
  const url = await getCurrentCvUrl(isLocale(lang) ? lang : "en");
  if (!url) return new Response("No CV has been published yet.", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}
