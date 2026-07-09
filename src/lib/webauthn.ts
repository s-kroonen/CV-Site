function siteUrl(): string {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

export function rpID(): string {
  return new URL(siteUrl()).hostname;
}

export const rpName = "CV Site Admin";

export function expectedOrigin(): string {
  return siteUrl();
}
