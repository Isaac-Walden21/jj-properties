import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { sessionOptions, type SessionData } from "./session-options";

export { sessionOptions, type SessionData };

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Signed-in user, re-read from the DB on every call: a removed account, a changed
 * role or a changed password takes effect immediately, not when the 8-hour cookie expires.
 */
export async function requireSession() {
  const session = await getSession();
  const user = session.userId ? getUserById(session.userId) : null;
  // A password change bumps session_version, signing out every older cookie.
  // Server components can't clear cookies, so a stale cookie goes through the logout route.
  if (!user || user.session_version !== (session.sessionVersion ?? 0)) {
    redirect(session.userId ? "/admin/logout" : "/admin/login");
  }
  return { userId: user.id, username: user.username, role: user.role };
}

/** Use in admin-only actions/pages (e.g. user management). */
export async function requireAdmin() {
  const user = await requireSession();
  if (user.role !== "admin") redirect("/admin");
  return user;
}
