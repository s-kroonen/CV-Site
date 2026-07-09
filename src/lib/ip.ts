import { createHash } from "node:crypto";

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

export function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
