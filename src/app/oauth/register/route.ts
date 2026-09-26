import { getDb } from "@/lib/db";
import { getTrustedIp } from "@/lib/auth/ip";
import { hit, registerClient } from "@/lib/oauth";
import { oauthError } from "@/lib/connector";

// RFC 7591 dynamic client registration. Stateless (signed client_id), so it writes
// nothing but the per-IP counter; bodies are capped because it's public.
export async function POST(request: Request) {
  const db = getDb();
  const ip = getTrustedIp(request.headers);
  if (ip && !hit(db, `register:${ip}`, 10, 60 * 60 * 1000)) {
    console.warn(`[oauth] register rate-limited ip=${ip}`);
    return oauthError("temporarily_unavailable", 429);
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return oauthError("invalid_client_metadata", 413, "Registration body too large.");
    body = JSON.parse(text);
  } catch {
    return oauthError("invalid_client_metadata", 400, "Body must be JSON.");
  }
  const r = registerClient(body);
  if (!r.ok) {
    console.warn(`[oauth] register rejected ip=${ip} ${r.error}`);
    return oauthError(r.error, r.status, r.description);
  }
  return Response.json(
    {
      ...r.client,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
