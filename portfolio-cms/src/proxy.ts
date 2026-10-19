import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "ar"];
const SESSION_COOKIES = ["__Host-portfolio_session", "portfolio_session"];

/**
 * Runs before routing:
 *  - adds the locale prefix to public URLs ("/" -> "/en", "/projects" -> "/en/projects"),
 *    honouring the visitor's last choice from the language switcher;
 *  - sends visitors without a session cookie from /admin to the login page.
 *    This is only a fast path: every admin page and action re-checks the
 *    session on the server.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const hasCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
    if (!hasCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const first = pathname.split("/")[1] ?? "";
  if (LOCALES.includes(first)) return NextResponse.next();

  const preferred = request.cookies.get("locale")?.value;
  const locale = preferred && LOCALES.includes(preferred) ? preferred : "en";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: [
    // Everything except API routes, media, the CV link, Next internals and files with an extension.
    "/((?!api|media|cv|_next|.*\\..*).*)",
  ],
};
