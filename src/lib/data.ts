import { prisma } from "@/lib/prisma";
import { publicWhere } from "@/lib/lifecycle";
import { localizeRows } from "@/lib/translations";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localizedPath, type Locale } from "@/lib/i18n/config";

// Public data access only. PrivateContact is deliberately never exposed here -
// see src/lib/private-contact.ts for the gated reveal flow.

// Every getter takes the display language: items written in another language are
// overlaid with their stored translation (see lib/translations.ts).

export async function getProfile(lang: Locale) {
  const row = await prisma.profile.findUnique({ where: { id: 1 } });
  if (!row) return null;
  const [localized] = await localizeRows("profile", [{ ...row, id: "1" }], lang);
  return { ...localized, id: row.id } as typeof row;
}

export async function getExperience(lang: Locale) {
  const rows = await prisma.experience.findMany({ where: publicWhere, orderBy: { sortIndex: "asc" } });
  return localizeRows("experience", rows, lang);
}

export async function getEducation(lang: Locale) {
  const rows = await prisma.education.findMany({ where: publicWhere, orderBy: { sortIndex: "asc" } });
  return localizeRows("education", rows, lang);
}

export async function getProjects(lang: Locale) {
  const rows = await prisma.project.findMany({
    where: publicWhere,
    orderBy: [{ featured: "desc" }, { sortIndex: "asc" }],
  });
  return localizeRows("projects", rows, lang);
}

export async function getProjectBySlug(slug: string, lang: Locale) {
  const row = await prisma.project.findFirst({ where: { slug, ...publicWhere } });
  if (!row) return null;
  return (await localizeRows("projects", [row], lang))[0];
}

export async function getSkills(lang: Locale) {
  const rows = await prisma.skill.findMany({ where: publicWhere, orderBy: [{ category: "asc" }, { sortIndex: "asc" }] });
  return localizeRows("skills", rows, lang);
}

/**
 * Whether any private contact detail exists (so the public page knows whether
 * to render the reveal button). Returns only a boolean - the values themselves
 * stay behind the Turnstile-gated /api/contact-info route.
 */
export async function hasPrivateContact(): Promise<boolean> {
  const contact = await prisma.privateContact.findUnique({ where: { id: 1 }, select: { email: true, phone: true } });
  return Boolean(contact && (contact.email || contact.phone));
}

/** Tabs for the public site nav (labels and links in `lang`); sections with nothing to show are left out. */
export async function getNavTabs(lang: Locale): Promise<{ href: string; label: string }[]> {
  const [experience, education, projects, skills] = await Promise.all([
    prisma.experience.count({ where: publicWhere }),
    prisma.education.count({ where: publicWhere }),
    prisma.project.count({ where: publicWhere }),
    prisma.skill.count({ where: publicWhere }),
  ]);
  const t = getDictionary(lang).nav;
  const tab = (path: string, label: string) => ({ href: localizedPath(lang, path), label });
  return [
    tab("/", t.overview),
    ...(experience ? [tab("/experience", t.experience)] : []),
    ...(projects ? [tab("/projects", t.projects)] : []),
    ...(skills ? [tab("/skills", t.skills)] : []),
    ...(education ? [tab("/education", t.education)] : []),
    tab("/contact", t.contact),
  ];
}
