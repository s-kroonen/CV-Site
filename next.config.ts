import type { NextConfig } from "next";

// Turnstile needs its own script/frame/connect origins; everything else is
// same-origin only. script-src/style-src allow 'unsafe-inline' as a
// pragmatic tradeoff - a full nonce-based CSP would require forcing every
// page in the app to render dynamically (no static optimization at all) and
// threading a per-request nonce through every client component, which isn't
// proportionate for a personal site with no user-generated script content.
const isDev = process.env.NODE_ENV === "development";

// React dev mode needs eval() to reconstruct server error stacks in the
// browser; never used in production builds.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  connect-src 'self' https://challenges.cloudflare.com;
  frame-src https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
