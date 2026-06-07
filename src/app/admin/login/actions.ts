"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserByUsername } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin") || "/admin";

  const user = getUserByUsername(username);
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) {
    return { error: "Invalid username or password." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.role = user.role;
  await session.save();
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/admin/login");
}
