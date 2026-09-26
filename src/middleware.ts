import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth/session-options";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(request, res, sessionOptions);

  // The only public admin route.
  const PUBLIC = new Set(["/admin/login"]);
  if (PUBLIC.has(pathname)) {
    // Already signed in? Skip login.
    if (pathname === "/admin/login" && session.userId) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return res;
  }

  if (!session.userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    // Keep the query: the Claude connect page carries its OAuth request in it.
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = { matcher: ["/admin/:path*"] };
