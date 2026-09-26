"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote } from "@/app/admin/actions";
import type { InquiryNote } from "@/types/crm";
import { formatWhen } from "@/lib/utils";

export default function NotesThread({
  inquiryId,
  initialNotes,
}: {
  inquiryId: number;
  initialNotes: InquiryNote[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await addNote(inquiryId, trimmed);
      if (r.error) return setError(r.error);
      setError(undefined);
      setBody("");
      router.refresh(); // re-fetch server-rendered notes
    });
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-stone-700">Notes</h2>

      <ul className="space-y-2">
        {initialNotes.length === 0 && <li className="text-xs text-stone-500">No notes yet.</li>}
        {initialNotes.map((n) => (
          <li key={n.id} className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap text-stone-800">{n.body}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-500">
              {n.author_username} · {formatWhen(n.created_at)}
            </p>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Add a note…"
          aria-label="New note"
          className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          disabled={pending || body.trim().length === 0}
          onClick={submit}
          className="rounded-md bg-stone-900 text-white px-3 py-1 text-sm font-medium disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
    </section>
  );
}
