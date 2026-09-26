import type { SessionOptions } from "iron-session";
import type { UserRole } from "@/types/crm";

// Kept apart from session.ts so middleware can read the cookie without pulling in SQLite.
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
