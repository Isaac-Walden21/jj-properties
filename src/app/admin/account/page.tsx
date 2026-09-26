import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listConnections } from "@/lib/oauth";
import { MCP_URL } from "@/lib/connector";
import { formatWhen } from "@/lib/utils";
import PasswordForm from "./PasswordForm";
import ClaudeConnections from "./ClaudeConnections";

export const metadata = { title: "Account · J & J Resort Properties Admin" };

export default async function AccountPage() {
  const me = await requireSession();
  const connections = listConnections(getDb(), me.userId).map((c) => ({
    family: c.family,
    client_name: c.client_name,
    connected: formatWhen(new Date(c.connected_at).toISOString().slice(0, 19).replace("T", " "), true),
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your account</h1>
        <p className="text-sm text-stone-600">Signed in as {me.username}.</p>
      </div>
      <PasswordForm />
      <ClaudeConnections connections={connections} mcpUrl={MCP_URL} />
    </div>
  );
}
