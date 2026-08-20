import Link from "next/link";
import { signOutAction } from "@/app/admin/login/actions";
import type { UserRole } from "@/types/crm";

/**
 * Chrome for every signed-in admin page.
 *
 * The nav links only to routes that exist. It previously pointed at
 * /admin/users and /admin/account -- CRM plan Tasks 13 and 14, both parked --
 * and at /admin, which had no page at all, so a correct login landed on a 404.
 * A nav item that 404s is worse than a missing one: it reads as a broken
 * deploy rather than an unbuilt feature. The launcher at /admin says what is
 * still coming.
 */
export default function AdminShell({
  username,
  role,
  children,
}: {
  username: string;
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-semibold tracking-tight">
            J & J Resort Properties · Admin
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="hover:text-stone-600">Home</Link>
            <Link href="/admin/marketing" className="hover:text-stone-600">Marketing</Link>
            <Link href="/admin/marketing/contacts" className="hover:text-stone-600">Contacts</Link>
            {/*
              Plain text, not a link: /admin/account is parked (CRM plan Task 14).
              The role is shown because it decides what this user can do — only
              an admin can create a campaign or import a guest list.
            */}
            <span className="text-stone-500">
              {username}
              {role === "admin" && (
                <span className="ml-1.5 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-600">
                  Admin
                </span>
              )}
            </span>
            <form action={signOutAction}>
              <button className="rounded-md border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
