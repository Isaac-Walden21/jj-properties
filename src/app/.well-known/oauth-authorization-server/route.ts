import { SITE_URL } from "@/lib/site-url";

// RFC 8414. Public clients only (Claude registers via DCR), PKCE S256 required.
export function GET() {
  return Response.json({
    issuer: SITE_URL,
    authorization_endpoint: `${SITE_URL}/admin/connect`,
    token_endpoint: `${SITE_URL}/oauth/token`,
    registration_endpoint: `${SITE_URL}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["leads", "offline_access"],
  });
}
