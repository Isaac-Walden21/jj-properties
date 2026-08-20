import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

/**
 * Contact list.
 *
 * Placeholder shell. The list, filters, detail page, tag editor and CSV import
 * land in the contacts tasks, once the contacts table and its data-access
 * layer exist. This exists now so the nav has no dead links meanwhile.
 */
export default async function ContactsHome() {
  await requireSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-stone-600">
          Everyone who can be emailed, where they came from, and who has opted out.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-100/60 p-6">
        <p className="text-sm text-stone-600">
          The contacts table does not exist yet. Inquiry submissions are being saved
          to the inquiries table, but nothing is being turned into a mailable
          contact until the marketing schema lands.
        </p>
      </div>
    </div>
  );
}
