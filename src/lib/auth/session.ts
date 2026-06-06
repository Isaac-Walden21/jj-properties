import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/crm";

export interface SessionData {
  userId?: number;
  username?: string;
  role?: UserRole;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "jj_admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.userId) redirect("/admin/login");
  return session;
}

/** Use in admin-only actions/pages (e.g. user management). */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/admin");
  return session;
}
