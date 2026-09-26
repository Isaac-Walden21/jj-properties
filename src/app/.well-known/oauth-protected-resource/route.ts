import { SITE_URL } from "@/lib/site-url";
import { MCP_URL } from "@/lib/connector";

// RFC 9728. Claude reads this first to find the authorization server.
export function GET() {
  return Response.json({
    resource: MCP_URL,
    authorization_servers: [SITE_URL],
    scopes_supported: ["leads"],
    bearer_methods_supported: ["header"],
  });
}
