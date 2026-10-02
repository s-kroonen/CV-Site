import { createHash, randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { authenticateBearer } from "@/lib/api-tokens";
import { createAuthCode, exchangeCode, parseAuthRequest, refreshAccess, registerClient, revokeGrant, validRedirectUri } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db";

const REDIRECT = "http://localhost:9999/callback";
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");

beforeEach(resetDb);

async function client(redirect = REDIRECT) {
  const r = await registerClient({ client_name: "Test app", redirect_uris: [redirect] });
  if ("error" in r) throw new Error(r.error);
  return r.client.clientId;
}

async function authorize(clientId: string, scopes: ("read" | "write" | "private")[] = ["read", "write"]) {
  const parsed = await parseAuthRequest({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "s",
  });
  if (parsed.kind !== "ok") throw new Error(parsed.kind);
  return createAuthCode(parsed.request, scopes);
}

const form = (o: Record<string, string>) => new URLSearchParams(o);
const exchange = (clientId: string, code: string, v = verifier, redirect = REDIRECT) =>
  exchangeCode(form({ client_id: clientId, code, redirect_uri: redirect, code_verifier: v }));

describe("registration", () => {
  it("accepts https and loopback http redirects only", () => {
    expect(validRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(validRedirectUri("http://localhost:3000/cb")).toBe(true);
    expect(validRedirectUri("http://127.0.0.1:1/cb")).toBe(true);
    expect(validRedirectUri("http://evil.example/cb")).toBe(false);
    expect(validRedirectUri("javascript:alert(1)")).toBe(false);
    expect(validRedirectUri("https://x.test/cb#frag")).toBe(false);
  });

  it("rejects bad redirect lists", async () => {
    expect(await registerClient({ redirect_uris: [] })).toMatchObject({ error: "invalid_redirect_uri" });
    expect(await registerClient({ redirect_uris: ["http://evil.example/cb"] })).toMatchObject({ error: "invalid_redirect_uri" });
  });
});

describe("authorization request", () => {
  it("never redirects for an unknown client or unregistered redirect address", async () => {
    const id = await client();
    expect((await parseAuthRequest({ client_id: "nope", redirect_uri: REDIRECT })).kind).toBe("fatal");
    expect((await parseAuthRequest({ client_id: id, redirect_uri: "https://evil.example/cb", response_type: "code" })).kind).toBe("fatal");
  });

  it("requires PKCE S256 (reported back to the client)", async () => {
    const id = await client();
    const base = { client_id: id, redirect_uri: REDIRECT, response_type: "code" };
    expect(await parseAuthRequest({ ...base, code_challenge: challenge, code_challenge_method: "plain" })).toMatchObject({ kind: "redirect_error", error: "invalid_request" });
    expect(await parseAuthRequest({ ...base })).toMatchObject({ kind: "redirect_error" });
    expect(await parseAuthRequest({ ...base, response_type: "token", code_challenge: challenge, code_challenge_method: "S256" })).toMatchObject({ error: "unsupported_response_type" });
  });
});

describe("token exchange", () => {
  it("issues an access token that works with the granted scopes", async () => {
    const id = await client();
    const res = await exchange(id, await authorize(id));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.body).toMatchObject({ token_type: "Bearer", scope: "read write", expires_in: 3600 });
    const authed = await authenticateBearer(new Request("http://x", { headers: { Authorization: `Bearer ${res.body.access_token}` } }));
    expect(authed?.scopes).toEqual(["read", "write"]);
  });

  it("burns codes: wrong verifier, replay, wrong client and wrong redirect all fail", async () => {
    const id = await client();
    const other = await client();

    const c1 = await authorize(id);
    expect(await exchange(id, c1, "y".repeat(50))).toMatchObject({ ok: false, error: "invalid_grant" });
    expect(await exchange(id, c1)).toMatchObject({ ok: false, error: "invalid_grant" }); // already burned

    const c2 = await authorize(id);
    expect(await exchange(other, c2)).toMatchObject({ ok: false, error: "invalid_grant" });
    const c3 = await authorize(id);
    expect(await exchange(id, c3, verifier, "http://localhost:1/other")).toMatchObject({ ok: false, error: "invalid_grant" });

    const c4 = await authorize(id);
    expect((await exchange(id, c4)).ok).toBe(true);
    expect(await exchange(id, c4)).toMatchObject({ ok: false });
  });

  it("rejects expired codes", async () => {
    const id = await client();
    const code = await authorize(id);
    await prisma.oAuthCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await exchange(id, code)).toMatchObject({ ok: false, error: "invalid_grant" });
  });
});

describe("refresh tokens", () => {
  async function connected() {
    const id = await client();
    const res = await exchange(id, await authorize(id));
    if (!res.ok) throw new Error("exchange failed");
    return { id, ...(res.body as { access_token: string; refresh_token: string }) };
  }
  const refresh = (clientId: string, token: string) => refreshAccess(form({ client_id: clientId, refresh_token: token }));

  it("rotates, and reuse of an old refresh token revokes the whole connection", async () => {
    const first = await connected();
    const next = await refresh(first.id, first.refresh_token);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.body.refresh_token).not.toBe(first.refresh_token);

    const ping = (t: string) => authenticateBearer(new Request("http://x", { headers: { Authorization: `Bearer ${t}` } }));
    expect(await ping(next.body.access_token as string)).not.toBeNull();

    expect(await refresh(first.id, first.refresh_token)).toMatchObject({ ok: false, error: "invalid_grant" });
    expect(await ping(next.body.access_token as string)).toBeNull(); // grant killed
  });

  it("revokeGrant cuts off access tokens immediately", async () => {
    const c = await connected();
    const grant = await prisma.oAuthGrant.findFirstOrThrow();
    await revokeGrant(grant.id);
    expect(await authenticateBearer(new Request("http://x", { headers: { Authorization: `Bearer ${c.access_token}` } }))).toBeNull();
    expect(await refresh(c.id, c.refresh_token)).toMatchObject({ ok: false });
  });

  it("will not refresh for a different client", async () => {
    const c = await connected();
    expect(await refresh(await client(), c.refresh_token)).toMatchObject({ ok: false });
  });
});
