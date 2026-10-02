import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicWhere } from "@/lib/lifecycle";
import { LOCALES, localizedPath } from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/seo";
import { ensureItemSlugs } from "@/lib/slug";

export const dynamic = "force-dynamic";

const newest = (dates: Array<Date | undefined>) => dates.filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0];

/** One entry per language for a path, each pointing at all its translations (hreflang) incl. x-default. */
function entries(path: string, lastModified: Date | undefined, priority: number): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(localizedPath(l, path));
  languages["x-default"] = languages[LOCALES[0]];
  return LOCALES.map((l) => ({
    url: absoluteUrl(localizedPath(l, path)),
    lastModified,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await ensureItemSlugs();
  const [profile, exp, edu, projects, skills, translations] = await Promise.all([
    prisma.profile.findUnique({ where: { id: 1 }, select: { updatedAt: true } }),
    prisma.experience.findMany({ where: publicWhere, select: { slug: true, updatedAt: true } }),
    prisma.education.findMany({ where: publicWhere, select: { slug: true, updatedAt: true } }),
    prisma.project.findMany({ where: publicWhere, select: { slug: true, updatedAt: true } }),
    prisma.skill.findMany({ where: publicWhere, select: { updatedAt: true } }),
    prisma.translation.findMany({ select: { updatedAt: true } }),
  ]);

  const last = (rows: { updatedAt: Date }[]) => newest(rows.map((r) => r.updatedAt));
  const all = newest([profile?.updatedAt, last(exp), last(edu), last(projects), last(skills), last(translations)]);

  return [
    ...entries("/", all, 1),
    ...(exp.length ? entries("/experience", last(exp), 0.8) : []),
    ...(projects.length ? entries("/projects", last(projects), 0.8) : []),
    ...(skills.length ? entries("/skills", last(skills), 0.6) : []),
    ...(edu.length ? entries("/education", last(edu), 0.6) : []),
    ...entries("/contact", undefined, 0.5),
    ...projects.flatMap((p) => entries(`/projects/${p.slug}`, p.updatedAt, 0.7)),
    ...exp.flatMap((e) => (e.slug ? entries(`/experience/${e.slug}`, e.updatedAt, 0.7) : [])),
    ...edu.flatMap((e) => (e.slug ? entries(`/education/${e.slug}`, e.updatedAt, 0.5) : [])),
  ];
}
