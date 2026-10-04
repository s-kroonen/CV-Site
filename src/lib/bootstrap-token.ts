import { issueToken, verifyToken } from "@/lib/session";

const BOOTSTRAP_TTL_SECONDS = 15 * 60;

/**
 * One-time setup link token. `additional: true` also allows registering a passkey when one already exists
 * (needed when passkeys move to another domain setting, see docs/REDUNDANCY.md); minting it takes shell access.
 */
export function issueBootstrapToken(additional = false): string {
  return issueToken("admin-bootstrap", additional ? { additional: "1" } : {}, BOOTSTRAP_TTL_SECONDS);
}

export function isValidBootstrapToken(token: string | undefined | null): boolean {
  return verifyToken(token, "admin-bootstrap") !== null;
}

/** May this token register a passkey, given how many already exist? */
export function canRegisterPasskey(token: string | undefined | null, existingCount: number): boolean {
  const data = verifyToken(token, "admin-bootstrap");
  if (!data) return false;
  return existingCount === 0 || data.additional === "1";
}
