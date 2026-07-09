import { issueToken, verifyToken } from "@/lib/session";

export const CHALLENGE_COOKIE = "webauthn_challenge";
const CHALLENGE_TTL_SECONDS = 5 * 60;

export function issueChallengeCookieValue(challenge: string): string {
  return issueToken("webauthn-challenge", { challenge }, CHALLENGE_TTL_SECONDS);
}

export function readChallenge(token: string | undefined | null): string | null {
  const data = verifyToken(token, "webauthn-challenge");
  return data?.challenge ?? null;
}

export function challengeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  };
}
