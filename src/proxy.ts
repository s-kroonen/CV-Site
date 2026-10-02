import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-session";
import { LOCALE_COOKIE, localizedPath, negotiateLocale, splitLocale, isLocale } from "@/lib/i18n/config";

const PUBLIC_PREFIXES = [
  "/admin/login",
  "/admin/setup",
  "/api/admin/setup",
  "/api/admin/login",
];

// Paths that are not part of the localized public site.
const NOT_LOCALIZED = ["/admin", "/api", "/oauth", "/uploads", "/_next", "/.well-known", "/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt", "/favicon.ico"];

function adminGate(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (isValidAdminSession(session)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return adminGate(request);
  if (NOT_LOCALIZED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const { lang } = splitLocale(pathname);

  // Public page without a language prefix: send the visitor to their language
  // (remembered choice first, then the browser's Accept-Language, else English).
  if (!lang) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const target = isLocale(saved) ? saved : negotiateLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(target, pathname);
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Vary", "Accept-Language, Cookie");
    return res;
  }

  // Visiting /nl/... or /en/... is an explicit choice: remember it for the bare "/" next time.
  const res = NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE)?.value !== lang) {
    res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}

export const config = {
  // Everything except static assets (anything with a file extension) and Next internals.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
