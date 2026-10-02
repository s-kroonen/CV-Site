import { CORS_HEADERS, protectedResourceMetadata } from "@/lib/oauth";

// RFC 9728 metadata. Also answers the path-suffixed form
// (/.well-known/oauth-protected-resource/api/mcp) some clients request.
export const dynamic = "force-dynamic";

export const GET = () =>
  Response.json(protectedResourceMetadata(), { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" } });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS_HEADERS });
