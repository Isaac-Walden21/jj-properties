import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listInquiries } from "@/lib/db/inquiries";
import { properties } from "@/content/properties";
import InquiryFilters from "@/components/admin/InquiryFilters";
import { formatWhen } from "@/lib/utils";

export const metadata = { title: "Leads · J & J Resort Properties Admin" };

const propertyName = (slug: string | null) =>
  properties.find((p) => p.slug === slug)?.name ?? slug ?? "—";

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const sp = await searchParams;
  const inquiries = listInquiries({
    status: sp.status ?? "new",
    type: sp.type,
    property: sp.property,
    q: sp.q?.trim(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <span className="text-sm text-stone-500">{inquiries.length} shown</span>
      </div>

      <InquiryFilters />

      {/* Table on wide screens, cards on phones. */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {inquiries.map((i) => (
              <tr key={i.id} className={i.is_read ? "bg-white" : "bg-amber-50/60"}>
                <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                  {formatWhen(i.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/inquiries/${i.id}`} className="font-medium text-stone-900 hover:underline">
                    {i.first_name} {i.last_name}
                  </Link>
                  {!i.is_read && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">unread</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-700">{i.email}</td>
                <td className="px-4 py-3 capitalize">{i.inquiry_type}</td>
                <td className="px-4 py-3 text-stone-600">{propertyName(i.property_interest)}</td>
                <td className="px-4 py-3 capitalize">{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-2">
        {inquiries.map((i) => (
          <li key={i.id}>
            <Link
              href={`/admin/inquiries/${i.id}`}
              className={`block rounded-lg border border-stone-200 p-4 ${i.is_read ? "bg-white" : "bg-amber-50/60"}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{i.first_name} {i.last_name}</span>
                <span className="text-xs capitalize text-stone-500">{i.status}</span>
              </div>
              <div className="mt-1 text-sm text-stone-600 break-all">{i.email}</div>
              <div className="mt-1 text-xs text-stone-500 capitalize">
                {i.inquiry_type} · {propertyName(i.property_interest)} · {formatWhen(i.created_at, true)}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {inquiries.length === 0 && (
        <p className="rounded-lg border border-stone-200 bg-white px-4 py-8 text-center text-stone-500">
          No leads match these filters.
        </p>
      )}
    </div>
  );
}
