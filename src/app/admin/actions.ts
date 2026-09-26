"use server";
import { revalidatePath } from "next/cache";
import { requireSession, requireAdmin } from "@/lib/auth/session";
import { updateInquiry } from "@/lib/db/inquiries";
import { createNote } from "@/lib/db/notes";
import { createUser, removeUser, listUsers, getUserById, updateUserPassword } from "@/lib/db/users";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { revokeFamily } from "@/lib/oauth";
import type { InquiryStatus, UserRole } from "@/types/crm";

// Server actions are public endpoints: every argument is re-checked here.
// Errors are returned, not thrown — production builds hide thrown messages.
export type ActionResult = { error?: string };

const STATUSES: InquiryStatus[] = ["new", "contacted", "closed"];
const MIN_PASSWORD = 10;
const isId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;

export async function setInquiryStatus(id: number, status: InquiryStatus): Promise<ActionResult> {
  await requireSession();
  if (!isId(id) || !STATUSES.includes(status)) return { error: "Invalid status." };
  updateInquiry(id, { status });
  revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin");
  return {};
}

export async function setInquiryRead(id: number, isRead: boolean): Promise<ActionResult> {
  await requireSession();
  if (!isId(id) || typeof isRead !== "boolean") return { error: "Invalid request." };
  updateInquiry(id, { is_read: isRead });
  revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin");
  return {};
}

export async function addNote(inquiryId: number, body: string): Promise<ActionResult> {
  const user = await requireSession();
  const trimmed = String(body ?? "").trim();
  if (!isId(inquiryId) || !trimmed) return { error: "Note is empty." };
  if (trimmed.length > 5000) return { error: "Note is too long (5,000 characters max)." };
  try {
    createNote(inquiryId, user.userId, trimmed);
  } catch {
    return { error: "That lead no longer exists." };
  }
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  return {};
}

export async function addStaffUser(
  username: string,
  email: string,
  password: string,
  role: UserRole
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const u = String(username ?? "").trim();
  const e = String(email ?? "").trim().toLowerCase();
  if (!/^[a-zA-Z0-9._-]{2,32}$/.test(u)) return { error: "Username: 2–32 letters, numbers, dots, dashes." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: "Enter a valid email." };
  if (String(password ?? "").length < MIN_PASSWORD) return { error: `Password must be ${MIN_PASSWORD}+ characters.` };
  if (role !== "admin" && role !== "staff") return { error: "Invalid role." };
  try {
    createUser({ username: u, email: e, password_hash: await hashPassword(password), role, added_by: admin.userId });
  } catch {
    return { error: "That username or email is already in use." };
  }
  revalidatePath("/admin/users");
  return {};
}

export async function removeStaffUser(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!isId(id)) return { error: "Invalid user." };
  if (admin.userId === id) return { error: "You can't remove your own account." };
  const target = getUserById(id);
  if (!target) return {};
  if (target.role === "admin" && listUsers().filter((u) => u.role === "admin").length <= 1) {
    return { error: "Can't remove the last admin." };
  }
  // inquiry_notes.author_id references users with no cascade, so an author can't be deleted.
  try {
    removeUser(id);
  } catch {
    return { error: "This person has notes on leads, so their account can't be removed yet." };
  }
  revalidatePath("/admin/users");
  return {};
}

export async function changePassword(current: string, next: string): Promise<ActionResult> {
  const { userId } = await requireSession();
  const user = getUserById(userId)!;
  if (!(await verifyPassword(String(current ?? ""), user.password_hash))) {
    return { error: "Current password is wrong." };
  }
  if (String(next ?? "").length < MIN_PASSWORD) return { error: `New password must be ${MIN_PASSWORD}+ characters.` };
  const version = updateUserPassword(userId, await hashPassword(next));
  // Keep this browser signed in; every other session for this user is now invalid.
  const session = await getSession();
  session.sessionVersion = version;
  await session.save();
  return {};
}

export async function disconnectClaude(family: string): Promise<ActionResult> {
  const { userId } = await requireSession();
  // Only the caller's own connections: the family must belong to them.
  const owned = getDb()
    .prepare("SELECT 1 FROM oauth_tokens WHERE family = ? AND user_id = ? LIMIT 1")
    .get(String(family ?? ""), userId);
  if (!owned) return { error: "Connection not found." };
  revokeFamily(getDb(), String(family));
  revalidatePath("/admin/account");
  return {};
}
