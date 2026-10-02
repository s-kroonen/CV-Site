import { authenticateBearer } from "@/lib/api-tokens";
import { handleRpc } from "@/lib/mcp";
import { resourceMetadataUrl } from "@/lib/oauth";
import { rateLimit } from "@/lib/rate-limit";

// MCP endpoint (Streamable HTTP, stateless, JSON responses). Public path - it
// authenticates itself with a bearer token created in /admin/tokens.

const MAX_BODY_BYTES = 8 * 1024 * 1024; // image uploads arrive base64-encoded

function originAllowed(request: Request): boolean {
  // Non-browser MCP clients send no Origin. A browser page on another origin
  // must not be able to drive this endpoint (DNS-rebinding guard from the MCP spec).
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(process.env.SITE_URL ?? "").origin;
  } catch {
    return false;
  }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

export async function POST(request: Request) {
  if (!originAllowed(request)) return json({ error: "Origin not allowed." }, 403);

  const token = await authenticateBearer(request);
  if (!token) {
    // resource_metadata lets OAuth-capable clients (claude.ai, Claude Desktop) discover how to sign in.
    return json({ error: "Unauthorized" }, 401, {
      "WWW-Authenticate": `Bearer realm="cv-site-mcp", resource_metadata="${resourceMetadataUrl()}"`,
    });
  }
  if (!rateLimit(`mcp:${token.id}`, 120, 60_000)) return json({ error: "Rate limit exceeded." }, 429, { "Retry-After": "30" });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return json({ error: "Request too large." }, 413);

  const body = await request.json().catch(() => undefined);
  if (body === undefined) {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((m) => handleRpc(m, token)))).filter((r) => r !== null);
    return responses.length ? json(responses) : new Response(null, { status: 202 });
  }

  const response = await handleRpc(body, token);
  return response === null ? new Response(null, { status: 202 }) : json(response);
}

// No server-initiated streams and no sessions: say so per the spec.
const notAllowed = () => new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
export const GET = notAllowed;
export const DELETE = notAllowed;
