import { connection } from "next/server";

import { exportContent } from "@/server/admin/export";
import { getCurrentSession } from "@/server/auth/session";

/** Downloads all portfolio content as JSON (admin only). */
export async function GET() {
  await connection();
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Sign in to export content." }, { status: 401 });

  const data = await exportContent();
  const stamp = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="portfolio-content-${stamp}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
