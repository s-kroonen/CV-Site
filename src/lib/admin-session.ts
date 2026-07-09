import { issueToken, verifyToken } from "@/lib/session";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function issueAdminSessionCookieValue(): string {
  return issueToken("admin-session", {}, SESSION_TTL_SECONDS);
}

export function isValidAdminSession(token: string | undefined | null): boolean {
  return verifyToken(token, "admin-session") !== null;
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
