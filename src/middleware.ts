import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(request, res, sessionOptions);

  // Public admin routes: login and the password-reset flow.
  const PUBLIC = new Set(["/admin/login", "/admin/forgot-password", "/admin/reset-password"]);
  if (PUBLIC.has(pathname)) {
    // Already signed in? Skip login (but still allow reset pages, e.g. via email link).
    if (pathname === "/admin/login" && session.userId) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return res;
  }

  if (!session.userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = { matcher: ["/admin/:path*"] };
