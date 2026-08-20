import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { countInquiries } from "@/lib/db/inquiries";

export const metadata: Metadata = { title: "Admin" };

// Reads the inquiry counts on every request rather than at build time.
export const dynamic = "force-dynamic";

/**
 * The admin launcher.
 *
 * This route existing at all is the point: loginAction redirects here on
 * success, and until now nothing was mounted at /admin, so a correct login
 * landed on a 404.
 *
 * Inquiries and Staff accounts are rendered as disabled cards rather than
 * hidden. Hiding them would imply the CRM does not capture inquiries, which is
 * false -- /api/contact has been writing to the inquiries table since Task 6 of
 * the CRM plan. What is missing is only the UI to browse them. Saying so is
 * more useful to whoever opens this next than a shorter page would be.
 */
export default async function AdminHome() {
  const session = await requireSession();
  const isAdmin = session.role === "admin";
  const { total, unread } = countInquiries();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {session.username}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Marketing tools are live. Inquiry triage is still being built.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LauncherCard
          href="/admin/marketing"
          title="Marketing"
          body="Campaigns, audience segments, and sending history."
        />
        <LauncherCard
          href="/admin/marketing/contacts"
          title="Contacts"
          body="Everyone who can be emailed, where they came from, and who has opted out."
        />

        {/* Parked: CRM plan Tasks 10-12 (docs/superpowers/plans/2026-04-27-crm-inquiry-portal.md) */}
        <LauncherCard
          title="Inquiries"
          body={
            total === 0
              ? "No inquiries captured yet. They are saved as soon as the contact form is used."
              : `${total} inquir${total === 1 ? "y" : "ies"} captured${
                  unread > 0 ? `, ${unread} unread` : ""
                }. They are being saved, but there is no way to browse them here yet — they still arrive by email.`
          }
          disabled
        />

        {isAdmin && (
          /* Parked: CRM plan Task 13 */
          <LauncherCard
            title="Staff accounts"
            body="Adding and removing staff logins. Until this exists, accounts are created on the box with scripts/create-user.mjs."
            disabled
          />
        )}
      </div>
    </div>
  );
}

function LauncherCard({
  href,
  title,
  body,
  disabled = false,
}: {
  href?: string;
  title: string;
  body: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <h2 className="font-semibold tracking-tight">
        {title}
        {disabled && (
          <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-600">
            Coming soon
          </span>
        )}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>
    </>
  );

  if (disabled || !href) {
    return (
      <div
        aria-disabled="true"
        className="rounded-lg border border-dashed border-stone-300 bg-stone-100/60 p-5"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-lg border border-stone-200 bg-white p-5 transition hover:border-stone-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
    >
      {inner}
    </Link>
  );
}
