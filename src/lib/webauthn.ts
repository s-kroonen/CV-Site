function siteUrl(): string {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

/**
 * Relying-party ID of the passkeys. Defaults to the SITE_URL host. Set WEBAUTHN_RP_ID to a parent domain
 * (e.g. "kroon-en.nl") so one passkey works on every subdomain that serves the admin - see docs/REDUNDANCY.md.
 */
export function rpID(): string {
  return process.env.WEBAUTHN_RP_ID?.trim() || new URL(siteUrl()).hostname;
}

export const rpName = "CV Site Admin";

/** Origins a passkey ceremony may happen on: SITE_URL plus any in WEBAUTHN_ORIGINS (comma separated). */
export function expectedOrigin(): string | string[] {
  const extra = (process.env.WEBAUTHN_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => new URL(o).origin);
  if (extra.length === 0) return siteUrl();
  return [...new Set([new URL(siteUrl()).origin, ...extra])];
}
