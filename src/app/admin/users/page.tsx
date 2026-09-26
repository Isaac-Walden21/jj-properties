import { requireAdmin } from "@/lib/auth/session";
import { listUsers } from "@/lib/db/users";
import UsersTable from "./UsersTable";

export const metadata = { title: "Logins · J & J Resort Properties Admin" };

export default async function UsersPage() {
  const me = await requireAdmin(); // staff are redirected to /admin
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Logins</h1>
        <p className="text-sm text-stone-600">Everyone listed here can sign in and see all leads.</p>
      </div>
      <UsersTable users={listUsers()} currentUserId={me.userId} />
    </div>
  );
}
