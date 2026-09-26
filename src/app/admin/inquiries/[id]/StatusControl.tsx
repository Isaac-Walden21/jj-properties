"use client";
import { useState, useTransition } from "react";
import { setInquiryStatus, setInquiryRead } from "@/app/admin/actions";
import type { InquiryStatus } from "@/types/crm";

const STATUSES: InquiryStatus[] = ["new", "contacted", "closed"];

export default function StatusControl({
  id,
  initialStatus,
  initialIsRead,
}: {
  id: number;
  initialStatus: InquiryStatus;
  initialIsRead: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isRead, setIsRead] = useState(initialIsRead);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      <label className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">Status</span>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as InquiryStatus;
            const prev = status;
            setStatus(next);
            startTransition(async () => {
              const r = await setInquiryStatus(id, next);
              if (r.error) { setStatus(prev); setError(r.error); } else setError(undefined);
            });
          }}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">Mark as read</span>
        <input
          type="checkbox"
          checked={isRead}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setIsRead(next);
            startTransition(async () => {
              const r = await setInquiryRead(id, next);
              if (r.error) { setIsRead(!next); setError(r.error); } else setError(undefined);
            });
          }}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
