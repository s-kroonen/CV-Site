import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/json";
import { SCOPES, createApiToken, type Scope } from "@/lib/api-tokens";

// Minimal OAuth 2.1 authorization server for the MCP endpoint, as required by
// the MCP authorization spec: protected-resource + authorization-server
// metadata, dynamic client registration (public clients), authorization code
// flow with mandatory PKCE (S256), and refresh tokens with rotation.
// The only "user" is the site owner, who approves access with the admin
// passkey on the consent page. Access tokens are ordinary ApiToken rows, so the
// MCP endpoint and the admin token list work unchanged.

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000; // sliding 90 days
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CLIENTS = 500;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const random = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Public origin of the site (behind the reverse proxy the request URL can't be trusted). */
export function siteOrigin(): string {
  return new URL(process.env.SITE_URL ?? "http://localhost:3000").origin;
}
export const mcpResourceUrl = () => `${siteOrigin()}/api/mcp`;
export const resourceMetadataUrl = () => `${siteOrigin()}/.well-known/oauth-protected-resource`;

export function protectedResourceMetadata() {
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [siteOrigin()],
    bearer_methods_supported: ["header"],
    scopes_supported: [...SCOPES],
    resource_name: "CV site content (MCP)",
  };
}

export function authorizationServerMetadata() {
  const o = siteOrigin();
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize`,
    token_endpoint: `${o}/oauth/token`,
    registration_endpoint: `${o}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...SCOPES],
  };
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

// ---------------------------------------------------------------- clients

/** https anywhere, or http only for loopback (desktop clients listen on a local port). */
export function validRedirectUri(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 2000) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.hash) return false;
  if (u.protocol === "https:") return true;
  return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
}

export async function registerClient(body: unknown) {
  const b = (body ?? {}) as { client_name?: unknown; redirect_uris?: unknown };
  const uris = Array.isArray(b.redirect_uris) ? b.redirect_uris : [];
  if (uris.length === 0 || uris.length > 10 || !uris.every(validRedirectUri)) {
    return { error: "invalid_redirect_uri", error_description: "redirect_uris must be 1-10 https (or http loopback) URLs." };
  }
  const name = (typeof b.client_name === "string" && b.client_name.trim().slice(0, 100)) || "MCP client";

  // Registration is open by design (the protocol requires it); keep the table bounded.
  if ((await prisma.oAuthClient.count()) >= MAX_CLIENTS) {
    const oldest = await prisma.oAuthClient.findMany({ orderBy: { createdAt: "asc" }, take: 50, select: { id: true } });
    await prisma.oAuthClient.deleteMany({ where: { id: { in: oldest.map((c) => c.id) } } });
  }

  const client = await prisma.oAuthClient.create({ data: { clientId: `mcpc_${random(16)}`, name, redirectUris: uris } });
  return { client, redirectUris: uris as string[] };
}

export async function findClient(clientId: unknown) {
  if (typeof clientId !== "string" || !clientId) return null;
  const c = await prisma.oAuthClient.findUnique({ where: { clientId } });
  return c ? { ...c, redirectUris: asStringArray(c.redirectUris) } : null;
}

// ---------------------------------------------------------------- authorization

export type AuthRequest = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  requested: Scope[];
};

export type ParsedAuth =
  | { kind: "fatal"; message: string }
  | { kind: "redirect_error"; redirectUri: string; state: string | null; error: string }
  | { kind: "ok"; request: AuthRequest };

/**
 * Validates /oauth/authorize parameters. Problems with the client or redirect
 * URI must never redirect back (open-redirect risk): those are `fatal`.
 */
export async function parseAuthRequest(params: Record<string, string | undefined>): Promise<ParsedAuth> {
  const client = await findClient(params.client_id);
  if (!client) return { kind: "fatal", message: "Unknown application. Register it again and retry." };
  const redirectUri = params.redirect_uri;
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return { kind: "fatal", message: "The redirect address doesn't match what this application registered." };
  }
  const state = params.state ?? null;
  if (params.response_type !== "code") return { kind: "redirect_error", redirectUri, state, error: "unsupported_response_type" };
  if (!params.code_challenge || params.code_challenge_method !== "S256") {
    return { kind: "redirect_error", redirectUri, state, error: "invalid_request" }; // PKCE (S256) is mandatory
  }
  const requested = (params.scope ?? "").split(/\s+/).filter((s): s is Scope => (SCOPES as readonly string[]).includes(s));
  return {
    kind: "ok",
    request: { clientId: client.clientId, clientName: client.name, redirectUri, codeChallenge: params.code_challenge, state, requested },
  };
}

export async function createAuthCode(req: AuthRequest, scopes: Scope[]): Promise<string> {
  const code = random();
  await prisma.oAuthCode.create({
    data: {
      codeHash: sha256(code),
      clientId: req.clientId,
      redirectUri: req.redirectUri,
      codeChallenge: req.codeChallenge,
      scopes,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  // Opportunistic cleanup of stale codes.
  await prisma.oAuthCode.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } }).catch(() => {});
  return code;
}

// ---------------------------------------------------------------- tokens

const pkceOk = (verifier: string, challenge: string) =>
  verifier.length >= 43 && verifier.length <= 128 && createHash("sha256").update(verifier).digest("base64url") === challenge;

type TokenResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string; description: string };
const fail = (error: string, description: string): TokenResult => ({ ok: false, error, description });

async function issue(grantId: string, clientName: string, scopes: Scope[]) {
  const { token } = await createApiToken(
    `OAuth: ${clientName}`,
    scopes,
    new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
    grantId,
  );
  return token;
}

export async function exchangeCode(p: URLSearchParams): Promise<TokenResult> {
  const client = await findClient(p.get("client_id"));
  if (!client) return fail("invalid_client", "Unknown client_id.");
  const code = p.get("code") ?? "";
  const verifier = p.get("code_verifier") ?? "";

  const row = await prisma.oAuthCode.findUnique({ where: { codeHash: sha256(code) } });
  if (!row || row.clientId !== client.clientId || row.expiresAt < new Date() || row.usedAt) {
    return fail("invalid_grant", "The authorization code is invalid, expired or already used.");
  }
  // Atomically claim the code so concurrent replays can't both succeed.
  const claimed = await prisma.oAuthCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return fail("invalid_grant", "The authorization code was already used.");
  if (p.get("redirect_uri") !== row.redirectUri) return fail("invalid_grant", "redirect_uri does not match the authorization request.");
  if (!pkceOk(verifier, row.codeChallenge)) return fail("invalid_grant", "PKCE verification failed.");

  const scopes = asStringArray(row.scopes).filter((s): s is Scope => (SCOPES as readonly string[]).includes(s));
  const refresh = random();
  const grant = await prisma.oAuthGrant.create({
    data: {
      clientId: client.clientId,
      clientName: client.name,
      scopes,
      refreshHash: sha256(refresh),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      lastUsedAt: new Date(),
    },
  });
  return {
    ok: true,
    body: {
      access_token: await issue(grant.id, client.name, scopes),
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refresh,
      scope: scopes.join(" "),
    },
  };
}

export async function refreshAccess(p: URLSearchParams): Promise<TokenResult> {
  const client = await findClient(p.get("client_id"));
  if (!client) return fail("invalid_client", "Unknown client_id.");
  const presented = sha256(p.get("refresh_token") ?? "");

  const reused = await prisma.oAuthGrant.findFirst({ where: { prevRefreshHash: presented } });
  const grant = reused ?? (await prisma.oAuthGrant.findUnique({ where: { refreshHash: presented } }));
  if (!grant || grant.clientId !== client.clientId || grant.revokedAt || grant.expiresAt < new Date()) {
    return fail("invalid_grant", "The refresh token is invalid or expired.");
  }
  if (reused) {
    // An already-rotated refresh token came back: assume it leaked and kill the whole grant.
    await revokeGrant(grant.id);
    return fail("invalid_grant", "Refresh token reuse detected; the connection was revoked. Connect again.");
  }

  const next = random();
  await prisma.oAuthGrant.update({
    where: { id: grant.id },
    data: { refreshHash: sha256(next), prevRefreshHash: grant.refreshHash, lastUsedAt: new Date(), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  // Drop this grant's long-expired access tokens so the table doesn't grow forever.
  await prisma.apiToken.deleteMany({ where: { grantId: grant.id, expiresAt: { lt: new Date(Date.now() - 86_400_000) } } });

  const scopes = asStringArray(grant.scopes).filter((s): s is Scope => (SCOPES as readonly string[]).includes(s));
  return {
    ok: true,
    body: {
      access_token: await issue(grant.id, grant.clientName, scopes),
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: next,
      scope: scopes.join(" "),
    },
  };
}

export async function revokeGrant(grantId: string) {
  const now = new Date();
  await prisma.oAuthGrant.update({ where: { id: grantId }, data: { revokedAt: now } });
  await prisma.apiToken.updateMany({ where: { grantId, revokedAt: null }, data: { revokedAt: now } });
}
