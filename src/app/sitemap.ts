import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicWhere } from "@/lib/lifecycle";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const newest = (dates: Array<Date | undefined>) => dates.filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profile, exp, edu, projects, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { id: 1 }, select: { updatedAt: true } }),
    prisma.experience.findMany({ where: publicWhere, select: { updatedAt: true } }),
    prisma.education.findMany({ where: publicWhere, select: { updatedAt: true } }),
    prisma.project.findMany({ where: publicWhere, select: { slug: true, updatedAt: true } }),
    prisma.skill.findMany({ where: publicWhere, select: { updatedAt: true } }),
  ]);

  const last = (rows: { updatedAt: Date }[]) => newest(rows.map((r) => r.updatedAt));
  const all = newest([profile?.updatedAt, last(exp), last(edu), last(projects), last(skills)]);

  return [
    { url: absoluteUrl("/"), lastModified: all, changeFrequency: "monthly", priority: 1 },
    ...(exp.length ? [{ url: absoluteUrl("/experience"), lastModified: last(exp), priority: 0.8 }] : []),
    ...(projects.length ? [{ url: absoluteUrl("/projects"), lastModified: last(projects), priority: 0.8 }] : []),
    ...(skills.length ? [{ url: absoluteUrl("/skills"), lastModified: last(skills), priority: 0.6 }] : []),
    ...(edu.length ? [{ url: absoluteUrl("/education"), lastModified: last(edu), priority: 0.6 }] : []),
    { url: absoluteUrl("/contact"), priority: 0.5 },
    ...projects.map((p) => ({ url: absoluteUrl(`/projects/${p.slug}`), lastModified: p.updatedAt, priority: 0.7 })),
  ];
}
