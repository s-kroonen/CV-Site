import { issueToken, verifyToken } from "@/lib/session";

const BOOTSTRAP_TTL_SECONDS = 15 * 60;

export function issueBootstrapToken(): string {
  return issueToken("admin-bootstrap", {}, BOOTSTRAP_TTL_SECONDS);
}

export function isValidBootstrapToken(token: string | undefined | null): boolean {
  return verifyToken(token, "admin-bootstrap") !== null;
}
