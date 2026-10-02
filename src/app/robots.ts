import type { MetadataRoute } from "next";
import { AI_CRAWLERS, BLOCKED_CRAWLERS, PRIVATE_PATHS, absoluteUrl, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const allowed = AI_CRAWLERS.filter((bot) => !BLOCKED_CRAWLERS.includes(bot));
  const allow = ["/", "/uploads/", "/api/cv"];
  return {
    rules: [
      { userAgent: "*", allow, disallow: PRIVATE_PATHS },
      // Listed explicitly so the intent (AI search and assistants may read this site) is on record.
      ...(allowed.length ? [{ userAgent: allowed, allow, disallow: PRIVATE_PATHS }] : []),
      ...(BLOCKED_CRAWLERS.length ? [{ userAgent: BLOCKED_CRAWLERS, disallow: "/" }] : []),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
