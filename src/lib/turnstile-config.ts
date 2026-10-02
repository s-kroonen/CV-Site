// The Turnstile site key is public, but it must be read at *request* time on
// the server and passed down as a prop. Reading `process.env.NEXT_PUBLIC_*`
// directly in a component makes Next inline it at build time - and the Docker
// image is built in CI without the key, so production silently had no widget
// (reveal button and contact form did nothing). The name is assembled at
// runtime so the bundler can't inline it either.
export function getTurnstileSiteKey(): string | undefined {
  const legacyName = ["NEXT_PUBLIC", "TURNSTILE", "SITE", "KEY"].join("_");
  return process.env.TURNSTILE_SITE_KEY || process.env[legacyName] || undefined;
}
