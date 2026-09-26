"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserByUsername } from "@/lib/db/users";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { getTrustedIp } from "@/lib/auth/ip";
import { isLocked, recordFailure, clearFailures } from "@/lib/auth/throttle";

export interface LoginState {
  error?: string;
  username?: string; // echoed back: React resets the form after an action
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin") || "/admin";

  const ip = getTrustedIp(await headers());
  const keys = [`user:${username.toLowerCase()}`, ...(ip ? [`ip:${ip}`] : [])];
  if (isLocked(getDb(), keys)) {
    return { error: "Too many failed attempts. Wait 15 minutes and try again.", username };
  }

  const user = getUserByUsername(username);
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) {
    recordFailure(getDb(), keys);
    return { error: "Invalid username or password.", username };
  }
  clearFailures(getDb(), keys);

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.role = user.role;
  session.sessionVersion = user.session_version ?? 0;
  await session.save();
  // Only same-site admin paths; "//evil.com" style values fall back to /admin.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/admin/login");
}
