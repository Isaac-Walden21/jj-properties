"use client";
import { useState, useTransition } from "react";
import { changePassword } from "@/app/admin/actions";

export default function PasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        startTransition(async () => {
          const r = await changePassword(String(f.get("current")), String(f.get("next")));
          if (r.error) return setMsg({ ok: false, text: r.error });
          form.reset();
          setMsg({ ok: true, text: "Password changed." });
        });
      }}
      className="rounded-md border border-stone-200 bg-white p-4 space-y-3 max-w-sm"
    >
      <label className="flex flex-col text-xs text-stone-600">
        Current password
        <input name="current" type="password" required autoComplete="current-password" className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col text-xs text-stone-600">
        New password (10+ characters)
        <input name="next" type="password" required minLength={10} autoComplete="new-password" className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
      </label>
      {msg && <p className={`text-xs ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <button disabled={pending} className="rounded-md bg-stone-900 text-white px-3 py-2 text-sm font-medium disabled:opacity-60">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
