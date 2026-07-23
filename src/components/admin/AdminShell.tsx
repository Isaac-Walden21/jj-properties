import Link from "next/link";
import { signOutAction } from "@/app/admin/login/actions";
import type { UserRole } from "@/types/crm";

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
            <Link href="/admin" className="hover:text-stone-600">Inquiries</Link>
            {role === "admin" && (
              <Link href="/admin/users" className="hover:text-stone-600">Users</Link>
            )}
            <Link href="/admin/account" className="hover:text-stone-600">{username}</Link>
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
