import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";

/**
 * Marketing dashboard.
 *
 * Placeholder shell. The 30-day stat tiles, campaign list and suppression
 * health panel are built in the analytics task; the campaign lifecycle that
 * populates them lands before it. This exists now so the nav has no dead
 * links while the rest is being built.
 */
export default async function MarketingHome() {
  await requireSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="mt-1 text-sm text-stone-600">
          Email campaigns to the contact list.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-100/60 p-6">
        <p className="text-sm text-stone-600">
          No campaigns yet. Sending is not wired up — nothing here can email anyone.
        </p>
      </div>
    </div>
  );
}
