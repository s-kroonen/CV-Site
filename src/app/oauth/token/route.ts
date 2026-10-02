import { CORS_HEADERS, exchangeCode, refreshAccess } from "@/lib/oauth";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";

const NO_STORE = { ...CORS_HEADERS, "Cache-Control": "no-store", Pragma: "no-cache" };
const err = (error: string, error_description: string, status = 400) =>
  Response.json({ error, error_description }, { status, headers: NO_STORE });

export async function POST(request: Request) {
  if (!rateLimit(`oauth-token:${getClientIp(request)}`, 60, 10 * 60 * 1000)) {
    return err("invalid_request", "Too many requests.", 429);
  }
  const form = await request.formData().catch(() => null);
  if (!form) return err("invalid_request", "Expected an application/x-www-form-urlencoded body.");
  const p = new URLSearchParams(Array.from(form.entries()).map(([k, v]) => [k, String(v)]));

  const grantType = p.get("grant_type");
  if (grantType !== "authorization_code" && grantType !== "refresh_token") {
    return err("unsupported_grant_type", "Use authorization_code or refresh_token.");
  }
  const result = grantType === "authorization_code" ? await exchangeCode(p) : await refreshAccess(p);
  if (!result.ok) return err(result.error, result.description, result.error === "invalid_client" ? 401 : 400);
  return Response.json(result.body, { headers: NO_STORE });
}
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS_HEADERS });
