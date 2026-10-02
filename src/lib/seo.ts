import type { Metadata } from "next";

// Shared SEO / discoverability helpers.

/** Public origin of the site (SITE_URL), without trailing slash. */
export function siteUrl(): string {
  return new URL(process.env.SITE_URL ?? "http://localhost:3000").origin;
}

export const absoluteUrl = (path: string) => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Crawlers of AI assistants and AI search. They are allowed by default because
 * the point of this site is to be found and quoted accurately. To opt a bot out,
 * add its name to BLOCKED_CRAWLERS (robots.txt is advisory, not enforcement).
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
];
export const BLOCKED_CRAWLERS: string[] = [];

/** Paths that must never be indexed or crawled. */
export const PRIVATE_PATHS = ["/admin", "/api/", "/oauth/"];

/** JSON for an inline <script type="application/ld+json">; `<` is escaped so content cannot close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Trims text to a meta-description length at a word boundary. */
export function snippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

const ALTERNATE_TYPES = { "text/markdown": "/llms-full.txt", "application/json": "/api/cv.json" };
const DEFAULT_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Profile card" };

/**
 * Complete per-page metadata. Next.js replaces nested objects (openGraph, alternates,
 * twitter) between layout and page instead of merging them, so each page must carry
 * the whole set - otherwise it silently loses the canonical link and the social image.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: { url: string; width?: number; height?: number; alt?: string };
}): Metadata {
  const image = opts.image ?? DEFAULT_IMAGE;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path, types: ALTERNATE_TYPES },
    openGraph: { type: opts.type ?? "website", url: opts.path, title: opts.title, description: opts.description, images: [image] },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [image.url] },
  };
}

export const defaultSocialImage = DEFAULT_IMAGE;
export const alternateTypes = ALTERNATE_TYPES;
