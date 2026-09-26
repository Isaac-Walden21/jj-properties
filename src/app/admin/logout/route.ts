import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

// Clears a session whose account no longer exists (see requireSession).
export async function GET(request: Request) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
