"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createCode, validateAuthorize } from "@/lib/oauth";

// The consent form posts the original authorization request back here. It came
// through the browser, so it is re-validated from scratch before a code is issued.
function recheck(form: FormData) {
  const q = Object.fromEntries(
    ["client_id", "redirect_uri", "code_challenge", "state"].map((k) => [k, String(form.get(k) ?? "") || undefined])
  );
  return validateAuthorize({ ...q, response_type: "code", code_challenge_method: "S256" });
}

export async function approveConnect(form: FormData) {
  const { userId } = await requireSession();
  const v = recheck(form);
  if (!v.ok) redirect("/admin/connect?error=invalid");
  const url = new URL(v.params.redirect_uri);
  url.searchParams.set("code", createCode(getDb(), v.params, userId));
  if (v.params.state) url.searchParams.set("state", v.params.state);
  redirect(url.toString());
}

export async function denyConnect(form: FormData) {
  await requireSession();
  const v = recheck(form);
  if (!v.ok) redirect("/admin");
  const url = new URL(v.params.redirect_uri);
  url.searchParams.set("error", "access_denied");
  if (v.params.state) url.searchParams.set("state", v.params.state);
  redirect(url.toString());
}
