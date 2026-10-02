import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-session";
import { SCOPES, type Scope } from "@/lib/api-tokens";
import { createAuthCode, parseAuthRequest } from "@/lib/oauth";

// Receives the consent form. Everything is re-validated here: the hidden
// fields on the page are attacker-controllable, only the admin session is trusted.
export async function POST(request: Request) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSession(session)) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && k !== "scope") params[k] = v;

  const parsed = await parseAuthRequest(params);
  if (parsed.kind === "fatal") return new Response(parsed.message, { status: 400 });

  const redirectUri = parsed.kind === "ok" ? parsed.request.redirectUri : parsed.redirectUri;
  const state = parsed.kind === "ok" ? parsed.request.state : parsed.state;
  const finish = (set: Record<string, string>) => {
    const target = new URL(redirectUri);
    for (const [k, v] of Object.entries(set)) target.searchParams.set(k, v);
    if (state) target.searchParams.set("state", state);
    // The consent page submits with fetch (a form POST to another origin is blocked by our
    // CSP form-action) and navigates itself; plain form posts still get a 303.
    if ((request.headers.get("accept") ?? "").includes("application/json")) {
      return Response.json({ redirect: target.toString() }, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.redirect(target.toString(), 303);
  };

  if (parsed.kind === "redirect_error") return finish({ error: parsed.error });
  if (form.get("decision") !== "approve") return finish({ error: "access_denied" });

  const chosen = new Set(form.getAll("scope").map(String));
  const scopes = SCOPES.filter((s): s is Scope => s === "read" || chosen.has(s));
  const code = await createAuthCode(parsed.request, scopes);
  return finish({ code });
}
