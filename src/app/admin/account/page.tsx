import { requireSession } from "@/lib/auth/session";
import PasswordForm from "./PasswordForm";

export const metadata = { title: "Account · J & J Resort Properties Admin" };

export default async function AccountPage() {
  const me = await requireSession();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your account</h1>
        <p className="text-sm text-stone-600">Signed in as {me.username}.</p>
      </div>
      <PasswordForm />
    </div>
  );
}
