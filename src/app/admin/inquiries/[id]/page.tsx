import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getInquiry, updateInquiry } from "@/lib/db/inquiries";
import { listNotes } from "@/lib/db/notes";
import { properties } from "@/content/properties";
import StatusControl from "./StatusControl";
import NotesThread from "./NotesThread";
import { formatWhen } from "@/lib/utils";

export const metadata = { title: "Lead · J & J Resort Properties Admin" };

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const inquiry = getInquiry(id);
  if (!inquiry) notFound();
  const notes = listNotes(id);

  // Opening a lead marks it read.
  if (!inquiry.is_read) updateInquiry(id, { is_read: true });

  const property = properties.find((p) => p.slug === inquiry.property_interest)?.name ?? inquiry.property_interest;
  const fields: [string, string | null][] = [
    ["Type", inquiry.inquiry_type],
    ["Property", property],
    ["Came from", inquiry.source_page],
  ];
  if (inquiry.inquiry_type === "sell") {
    fields.push(
      ["Asking price", inquiry.sell_asking_price],
      ["Condition", inquiry.sell_condition],
      ["Would be happy with", inquiry.sell_walkaway]
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-stone-600 hover:underline">← All leads</Link>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-lg border border-stone-200 bg-white p-6 space-y-4 min-w-0">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold">{inquiry.first_name} {inquiry.last_name}</h1>
            <p className="text-sm text-stone-600 break-all">
              <a href={`mailto:${inquiry.email}`} className="hover:underline">{inquiry.email}</a>
              {" · "}
              {inquiry.phone ? <a href={`tel:${inquiry.phone}`} className="hover:underline">{inquiry.phone}</a> : "no phone"}
            </p>
            <p className="text-xs text-stone-500">Received {formatWhen(inquiry.created_at)}</p>
          </header>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-stone-500 text-xs uppercase tracking-wide">{label}</dt>
                <dd className="whitespace-pre-wrap">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h2 className="text-stone-500 text-xs uppercase tracking-wide mb-1">Message</h2>
            <p className="whitespace-pre-wrap text-stone-800">{inquiry.message}</p>
          </div>
        </article>

        <aside className="space-y-4">
          <StatusControl id={inquiry.id} initialStatus={inquiry.status} initialIsRead={true} />
          <NotesThread inquiryId={inquiry.id} initialNotes={notes} />
        </aside>
      </div>
    </div>
  );
}
