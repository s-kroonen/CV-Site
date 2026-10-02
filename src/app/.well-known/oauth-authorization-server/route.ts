import { CORS_HEADERS, authorizationServerMetadata } from "@/lib/oauth";

// RFC 8414 metadata.
export const dynamic = "force-dynamic";

export const GET = () =>
  Response.json(authorizationServerMetadata(), { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" } });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS_HEADERS });
