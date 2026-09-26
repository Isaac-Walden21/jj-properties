import { getDb } from "@/lib/db";
import { getTrustedIp } from "@/lib/auth/ip";
import { exchangeCode, hit, prune, refreshTokens, type TokenResult } from "@/lib/oauth";
import { oauthError } from "@/lib/connector";

// Claude posts application/x-www-form-urlencoded here for both the first exchange
// and every refresh; failures on a bad refresh must be `invalid_grant`.
export async function POST(request: Request) {
  const db = getDb();
  const ip = getTrustedIp(request.headers);
  if (ip && !hit(db, `token:${ip}`, 30, 60 * 1000)) return oauthError("temporarily_unavailable", 429);
  prune(db);

  let f: Record<string, string>;
  try {
    f = Object.fromEntries(new URLSearchParams(await request.text())) as Record<string, string>;
  } catch {
    return oauthError("invalid_request");
  }

  const r: TokenResult =
    f.grant_type === "authorization_code" ? exchangeCode(db, f)
    : f.grant_type === "refresh_token" ? refreshTokens(db, f)
    : { ok: false, error: "unsupported_grant_type" };

  if (!r.ok) {
    console.warn(`[oauth] token ${f.grant_type} rejected ip=${ip} ${r.error}${r.description ? ` (${r.description})` : ""}`);
    return oauthError(r.error, 400, r.description);
  }
  return Response.json(r.body, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}
