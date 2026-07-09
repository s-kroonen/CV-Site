import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless, signed tokens (HMAC-SHA256) instead of a server-side session
// store. This app can run as two independent, identically-deployed
// containers (see docs/DEPLOYMENT.md) with no shared session storage
// between them - a signed cookie verifies with just SESSION_SECRET on
// either host, whereas an opaque/DB-backed session could be created on one
// host and momentarily missing on the other after failover.

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueToken(purpose: string, data: Record<string, string>, ttlSeconds: number): string {
  const body = { purpose, data, exp: Date.now() + ttlSeconds * 1000 };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyToken(
  token: string | undefined | null,
  purpose: string,
): Record<string, string> | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (body.purpose !== purpose) return null;
    if (typeof body.exp !== "number" || Date.now() > body.exp) return null;
    return body.data;
  } catch {
    return null;
  }
}
