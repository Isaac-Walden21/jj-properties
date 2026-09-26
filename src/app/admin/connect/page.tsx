import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { validateAuthorize } from "@/lib/oauth";
import { approveConnect, denyConnect } from "./actions";

export const metadata = { title: "Connect Claude · J & J Resort Properties Admin" };

// OAuth authorization endpoint. Claude sends the user here; middleware has
// already made them sign in to the back office.
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await requireSession();
  const q = await searchParams;
  const v = validateAuthorize(getDb(), q);

  if (!v.ok && v.redirectable && q.redirect_uri) {
    const url = new URL(q.redirect_uri);
    url.searchParams.set("error", v.error);
    if (q.state) url.searchParams.set("state", q.state);
    redirect(url.toString());
  }
  if (!v.ok) {
    return (
      <div className="max-w-md rounded-lg border border-stone-200 bg-white p-6 space-y-2">
        <h1 className="text-xl font-semibold">Can&apos;t connect Claude</h1>
        <p className="text-sm text-stone-600">
          {q.error === "invalid" ? "This sign-in link expired. Start again from Claude." : v.error}
        </p>
      </div>
    );
  }

  const returnHost = new URL(v.params.redirect_uri).host;
  return (
    <div className="max-w-md rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <h1 className="text-xl font-semibold">Connect Claude to your leads?</h1>
      <p className="text-sm text-stone-700">
        <strong>{v.clientName || "Claude"}</strong> will act as <strong>{me.username}</strong>. It will be able to:
      </p>
      <ul className="list-disc pl-5 text-sm text-stone-700 space-y-1">
        <li>See every lead and its notes</li>
        <li>Change a lead&apos;s status and mark it read</li>
        <li>Add notes under your name</li>
      </ul>
      <p className="text-sm text-stone-600">It can&apos;t delete leads, send email, or manage logins. You can disconnect it any time from your account page.</p>
      <p className="text-xs text-stone-500">After you allow, you&apos;ll go back to <strong>{returnHost}</strong>.</p>
      <div className="flex gap-3">
        {[approveConnect, denyConnect].map((action, i) => (
          <form key={i} action={action}>
            <input type="hidden" name="client_id" value={v.params.client_id} />
            <input type="hidden" name="redirect_uri" value={v.params.redirect_uri} />
            <input type="hidden" name="code_challenge" value={v.params.code_challenge} />
            <input type="hidden" name="state" value={v.params.state ?? ""} />
            <button
              className={
                i === 0
                  ? "rounded-md bg-stone-900 text-white px-4 py-2 text-sm font-medium"
                  : "rounded-md border border-stone-300 px-4 py-2 text-sm"
              }
            >
              {i === 0 ? "Allow" : "Cancel"}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
