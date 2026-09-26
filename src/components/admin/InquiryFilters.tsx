"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { properties } from "@/content/properties";

const STATUSES = ["all", "new", "contacted", "closed"] as const;
const TYPES = ["all", "buy", "sell", "invest", "general"] as const;

// Same source the public form uses (value = slug), so the filter never drifts.
const PROPERTY_OPTIONS = [
  { value: "all", label: "All properties" },
  ...properties.map((p) => ({ value: p.slug, label: p.name })),
];

export default function InquiryFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    // Status defaults to "new", so "all" has to be explicit in the URL.
    if (!value || (value === "all" && key !== "status")) sp.delete(key);
    else sp.set(key, value);
    router.push(`/admin?${sp.toString()}`);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 mb-4"
      onSubmit={(e) => {
        e.preventDefault();
        update("q", String(new FormData(e.currentTarget).get("q") ?? "").trim());
      }}
    >
      <Select label="Status" value={params.get("status") ?? "new"} options={STATUSES.map((s) => ({ value: s, label: s }))} onChange={(v) => update("status", v)} />
      <Select label="Type" value={params.get("type") ?? "all"} options={TYPES.map((t) => ({ value: t, label: t }))} onChange={(v) => update("type", v)} />
      <Select label="Property" value={params.get("property") ?? "all"} options={PROPERTY_OPTIONS} onChange={(v) => update("property", v)} />
      <label className="flex flex-col text-xs text-stone-600">
        Search
        <input
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Name or email"
          className="mt-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
      </label>
    </form>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col text-xs text-stone-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-sm capitalize"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
