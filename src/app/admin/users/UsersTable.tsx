"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStaffUser, removeStaffUser } from "@/app/admin/actions";
import type { StaffUser, UserRole } from "@/types/crm";

export default function UsersTable({ users, currentUserId }: { users: StaffUser[]; currentUserId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function add(form: HTMLFormElement) {
    const f = new FormData(form);
    startTransition(async () => {
      const r = await addStaffUser(
        String(f.get("username")),
        String(f.get("email")),
        String(f.get("password")),
        String(f.get("role")) as UserRole
      );
      if (r.error) return setError(r.error);
      setError(undefined);
      form.reset();
      router.refresh();
    });
  }

  function remove(u: StaffUser) {
    if (!window.confirm(`Remove ${u.username}? They will be signed out and can't log in again.`)) return;
    startTransition(async () => {
      const r = await removeStaffUser(u.id);
      if (r.error) return setError(r.error);
      setError(undefined);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-stone-100 rounded-md border border-stone-200 bg-white">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0">
              {u.username} <span className="text-stone-500 break-all">· {u.email}</span>
              <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-600">{u.role}</span>
            </span>
            {u.id !== currentUserId && (
              <button onClick={() => remove(u)} disabled={pending} className="text-xs text-red-600 hover:underline shrink-0">
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(e.currentTarget);
        }}
        className="rounded-md border border-stone-200 bg-white p-4 space-y-3"
      >
        <h2 className="text-sm font-semibold text-stone-700">Add a person</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Username" name="username" autoComplete="off" />
          <Field label="Email" name="email" type="email" />
          <Field label="Starting password (10+ characters)" name="password" type="text" autoComplete="off" />
          <label className="flex flex-col text-xs text-stone-600">
            Access
            <select name="role" defaultValue="staff" className="mt-1 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm">
              <option value="staff">Staff: works leads</option>
              <option value="admin">Admin: also manages logins</option>
            </select>
          </label>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button disabled={pending} className="rounded-md bg-stone-900 text-white px-3 py-2 text-sm font-medium disabled:opacity-60">
          {pending ? "Saving…" : "Add person"}
        </button>
        <p className="text-xs text-stone-500">Give them the starting password yourself. They can change it under their name in the top bar.</p>
      </form>
    </div>
  );
}

function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete?: string }) {
  return (
    <label className="flex flex-col text-xs text-stone-600">
      {label}
      <input name={name} type={type} required autoComplete={autoComplete} className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
    </label>
  );
}
