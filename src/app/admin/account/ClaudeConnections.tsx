"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectClaude } from "@/app/admin/actions";

export default function ClaudeConnections({
  connections,
  mcpUrl,
}: {
  connections: { family: string; connected: string }[];
  mcpUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-md border border-stone-200 bg-white p-4 space-y-3 max-w-xl">
      <h2 className="text-sm font-semibold text-stone-700">Claude</h2>
      <p className="text-sm text-stone-600">
        To use your leads in Claude: Settings → Connectors → Add custom connector, and paste{" "}
        <code className="break-all rounded bg-stone-100 px-1 py-0.5 text-xs">{mcpUrl}</code>. Claude will send you here to sign in and allow it.
      </p>
      {connections.length === 0 ? (
        <p className="text-xs text-stone-500">Not connected.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
          {connections.map((c) => (
            <li key={c.family} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                Claude <span className="text-stone-500">· connected {c.connected}</span>
              </span>
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await disconnectClaude(c.family);
                    if (r.error) return setError(r.error);
                    router.refresh();
                  })
                }
                className="text-xs text-red-600 hover:underline shrink-0"
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
