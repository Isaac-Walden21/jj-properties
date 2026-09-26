import { SITE_URL } from "@/lib/site-url";

// Claude requires the protected-resource `resource` to equal the URL typed into
// Claude exactly, so both come from the one canonical origin.
export const MCP_URL = `${SITE_URL}/api/mcp`;
export const RESOURCE_METADATA_URL = `${SITE_URL}/.well-known/oauth-protected-resource`;

export function oauthError(error: string, status = 400, description?: string) {
  return Response.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
