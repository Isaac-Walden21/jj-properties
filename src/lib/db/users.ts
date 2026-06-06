import "server-only";
import { getDb } from "./index";
import type { StaffUser } from "@/types/crm";

export interface UserWithHash extends StaffUser {
  password_hash: string;
}

export function getUserByUsername(username: string): UserWithHash | null {
  return (
    (getDb()
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
      .get(username.trim()) as UserWithHash | undefined) ?? null
  );
}

export function getUserById(id: number): UserWithHash | null {
  return (
    (getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserWithHash | undefined) ??
    null
  );
}

export function getUserByEmail(email: string): UserWithHash | null {
  return (
    (getDb()
      .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
      .get(email.trim()) as UserWithHash | undefined) ?? null
  );
}

export function listUsers(): StaffUser[] {
  return getDb()
    .prepare("SELECT id, username, email, role, created_at, added_by FROM users ORDER BY created_at ASC")
    .all() as StaffUser[];
}

export function createUser(input: {
  username: string;
  email: string;
  password_hash: string;
  role: "admin" | "staff";
  added_by: number | null;
}): number {
  return Number(
    getDb()
      .prepare(
        "INSERT INTO users (username, email, password_hash, role, added_by) VALUES (@username, @email, @password_hash, @role, @added_by)"
      )
      .run(input).lastInsertRowid
  );
}

export function updateUserPassword(id: number, password_hash: string): void {
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(password_hash, id);
}

export function removeUser(id: number): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function countUsers(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
}
