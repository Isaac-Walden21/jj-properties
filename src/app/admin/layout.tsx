import { getSession } from "@/lib/auth/session";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Login + password-reset pages render bare (middleware lets them through when logged out).
  if (!session.userId) return <>{children}</>;
  return (
    <AdminShell username={session.username ?? ""} role={session.role ?? "staff"}>
      {children}
    </AdminShell>
  );
}
