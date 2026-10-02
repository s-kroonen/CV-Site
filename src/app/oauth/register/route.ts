import { CORS_HEADERS, registerClient } from "@/lib/oauth";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";

// RFC 7591 dynamic client registration for public (PKCE) clients.
export async function POST(request: Request) {
  if (!rateLimit(`oauth-register:${getClientIp(request)}`, 20, 60 * 60 * 1000)) {
    return Response.json({ error: "too_many_requests" }, { status: 429, headers: CORS_HEADERS });
  }
  const result = await registerClient(await request.json().catch(() => null));
  if ("error" in result) return Response.json(result, { status: 400, headers: CORS_HEADERS });

  const { client, redirectUris } = result;
  return Response.json(
    {
      client_id: client.clientId,
      client_name: client.name,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
  );
}
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS_HEADERS });
