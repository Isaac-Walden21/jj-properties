import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getInquiry, listInquiries, updateInquiry } from "@/lib/db/inquiries";
import { createNote, listNotes } from "@/lib/db/notes";
import { hit, verifyAccessToken } from "@/lib/oauth";
import { RESOURCE_METADATA_URL } from "@/lib/connector";
import { properties } from "@/content/properties";
import type { Inquiry } from "@/types/crm";

// Claude connector (MCP over Streamable HTTP), stateless: a fresh server per
// request, acting as the staff user the bearer token was issued to. No delete,
// send or login-management tools — lead text is public-form input and may try
// to steer Claude, so the blast radius stays at status/read/notes.

const STATUS = z.enum(["new", "contacted", "closed"]);
const PROPERTY_SLUGS = properties.map((p) => p.slug) as [string, ...string[]];
const propertyName = (slug: string | null) => properties.find((p) => p.slug === slug)?.name ?? slug;

function summary(i: Inquiry) {
  return {
    id: i.id,
    received_utc: i.created_at,
    name: `${i.first_name} ${i.last_name}`,
    email: i.email,
    phone: i.phone,
    type: i.inquiry_type,
    property: propertyName(i.property_interest),
    status: i.status,
    read: i.is_read,
  };
}

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

function buildServer(userId: number) {
  const server = new McpServer({ name: "jj-resort-properties-leads", version: "1.0.0" });

  server.registerTool(
    "list_leads",
    {
      title: "List leads",
      description:
        "List J & J Resort Properties website leads (contact-form inquiries), newest first. " +
        "Filter by status, inquiry type, property, or a name/email search. Returns summaries; use get_lead for the message and notes.",
      inputSchema: {
        status: z.enum(["new", "contacted", "closed", "all"]).optional().describe('Default "all".'),
        type: z.enum(["buy", "sell", "invest", "general"]).optional(),
        property: z.enum(PROPERTY_SLUGS).optional().describe("Property slug."),
        search: z.string().max(100).optional().describe("Matches first name, last name or email."),
        limit: z.number().int().min(1).max(50).optional().describe("Default 25."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, type, property, search, limit }) =>
      json(listInquiries({ status: status ?? "all", type, property, q: search?.trim() }).slice(0, limit ?? 25).map(summary))
  );

  server.registerTool(
    "get_lead",
    {
      title: "Get lead",
      description: "Full detail for one lead: contact info, message, where it came from, sell details, and staff notes.",
      inputSchema: { id: z.number().int().positive() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const i = getInquiry(id);
      if (!i) return fail(`No lead with id ${id}.`);
      return json({
        ...summary(i),
        message: i.message,
        came_from_page: i.source_page,
        ...(i.inquiry_type === "sell"
          ? { asking_price: i.sell_asking_price, condition: i.sell_condition, would_be_happy_with: i.sell_walkaway }
          : {}),
        notes: listNotes(id).map((n) => ({ by: n.author_username, at_utc: n.created_at, text: n.body })),
      });
    }
  );

  server.registerTool(
    "set_lead_status",
    {
      title: "Set lead status",
      description: "Move a lead to new, contacted, or closed.",
      inputSchema: { id: z.number().int().positive(), status: STATUS },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, status }) => {
      if (!getInquiry(id)) return fail(`No lead with id ${id}.`);
      updateInquiry(id, { status });
      return json({ id, status });
    }
  );

  server.registerTool(
    "add_note",
    {
      title: "Add note to lead",
      description: "Add a staff note to a lead. The note is saved under the signed-in person's name.",
      inputSchema: { id: z.number().int().positive(), text: z.string().trim().min(1).max(5000) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ id, text }) => {
      if (!getInquiry(id)) return fail(`No lead with id ${id}.`);
      const n = createNote(id, userId, text);
      return json({ id, note: { by: n.author_username, at_utc: n.created_at, text: n.body } });
    }
  );

  server.registerTool(
    "mark_read",
    {
      title: "Mark lead read or unread",
      description: "Mark a lead as read (true) or unread (false) in the back office.",
      inputSchema: { id: z.number().int().positive(), read: z.boolean() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, read }) => {
      if (!getInquiry(id)) return fail(`No lead with id ${id}.`);
      updateInquiry(id, { is_read: read });
      return json({ id, read });
    }
  );

  return server;
}

async function handle(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const db = getDb();
  const auth = token ? verifyAccessToken(db, token) : null;
  if (!token || !auth) {
    // Claude only starts sign-in on a 401 that points at the resource metadata.
    return Response.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${RESOURCE_METADATA_URL}"` } }
    );
  }
  if (!hit(db, `mcp:${auth.userId}:${auth.clientId}`, 120, 60 * 1000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await buildServer(auth.userId).connect(transport);
  return transport.handleRequest(request, {
    authInfo: { token, clientId: auth.clientId, scopes: ["leads"], expiresAt: Math.floor(auth.expiresAt / 1000) },
  });
}

export { handle as GET, handle as POST, handle as DELETE };
