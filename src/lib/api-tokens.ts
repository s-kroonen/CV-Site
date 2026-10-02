import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/json";

export const SCOPES = ["read", "write", "private"] as const;
export type Scope = (typeof SCOPES)[number];

const TOKEN_PREFIX = "cvmcp_";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a token. The plaintext is returned once and never stored. */
export async function createApiToken(name: string, scopes: Scope[], expiresAt: Date | null, grantId?: string) {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  // "write" implies "read" so a writer can also look things up.
  const finalScopes = [...new Set<Scope>(scopes.includes("write") ? ["read", ...scopes] : scopes)];
  const row = await prisma.apiToken.create({
    data: { name, tokenHash: hash(token), prefix: token.slice(0, TOKEN_PREFIX.length + 6), scopes: finalScopes, expiresAt, grantId: grantId ?? null },
  });
  return { token, row };
}

export type AuthedToken = { id: string; name: string; scopes: Scope[] };

/** Resolves `Authorization: Bearer <token>`; null for anything missing, unknown, revoked or expired. */
export async function authenticateBearer(request: Request): Promise<AuthedToken | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match || !match[1].startsWith(TOKEN_PREFIX)) return null;

  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hash(match[1]) } });
  if (!row || row.revokedAt || (row.expiresAt && row.expiresAt < new Date())) return null;

  await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  const scopes = asStringArray(row.scopes).filter((s): s is Scope => (SCOPES as readonly string[]).includes(s));
  return { id: row.id, name: row.name, scopes };
}
