import { prisma } from "@/lib/prisma";
import { publicWhere } from "@/lib/lifecycle";
import { localizeRows } from "@/lib/translations";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { ensureItemSlugs } from "@/lib/slug";

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
  await ensureItemSlugs();
  const rows = await prisma.experience.findMany({
    where: publicWhere,
    orderBy: { sortIndex: "asc" },
    // Linked public projects, shown as small chips on the experience cards.
    include: { projects: { where: publicWhere, orderBy: [{ featured: "desc" }, { sortIndex: "asc" }], select: { title: true, slug: true } } },
  });
  return localizeRows("experience", rows, lang);
}

/** When anything public last changed (shown in the footer). */
export async function getLastUpdated(): Promise<Date | null> {
  const [profile, exp, edu, proj, skill, tr] = await Promise.all([
    prisma.profile.findUnique({ where: { id: 1 }, select: { updatedAt: true } }),
    prisma.experience.aggregate({ where: publicWhere, _max: { updatedAt: true } }),
    prisma.education.aggregate({ where: publicWhere, _max: { updatedAt: true } }),
    prisma.project.aggregate({ where: publicWhere, _max: { updatedAt: true } }),
    prisma.skill.aggregate({ where: publicWhere, _max: { updatedAt: true } }),
    prisma.translation.aggregate({ _max: { updatedAt: true } }),
  ]);
  const dates = [profile?.updatedAt, exp._max.updatedAt, edu._max.updatedAt, proj._max.updatedAt, skill._max.updatedAt, tr._max.updatedAt].filter(
    (d): d is Date => !!d,
  );
  return dates.length ? new Date(Math.max(...dates.map((d) => +d))) : null;
}

export async function getEducation(lang: Locale) {
  await ensureItemSlugs();
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
  await ensureItemSlugs();
  const row = await prisma.project.findFirst({
    where: { slug, ...publicWhere },
    include: { experiences: { where: publicWhere, orderBy: { sortIndex: "asc" } } },
  });
  if (!row) return null;
  const { experiences, ...project } = row;
  return {
    ...(await localizeRows("projects", [project], lang))[0],
    experiences: await localizeRows("experience", experiences, lang),
  };
}

/** One experience with the public projects and education it is linked to. */
export async function getExperienceBySlug(slug: string, lang: Locale) {
  await ensureItemSlugs();
  const row = await prisma.experience.findFirst({
    where: { slug, ...publicWhere },
    include: {
      projects: { where: publicWhere, orderBy: [{ featured: "desc" }, { sortIndex: "asc" }] },
      education: { where: publicWhere, orderBy: { sortIndex: "asc" } },
    },
  });
  if (!row) return null;
  const { projects, education, ...experience } = row;
  return {
    ...(await localizeRows("experience", [experience], lang))[0],
    projects: await localizeRows("projects", projects, lang),
    education: await localizeRows("education", education, lang),
  };
}

/**
 * One education item with its linked experiences and - through them - the projects.
 * (Education never links to projects directly: a project belongs to an experience.)
 */
export async function getEducationBySlug(slug: string, lang: Locale) {
  await ensureItemSlugs();
  const row = await prisma.education.findFirst({
    where: { slug, ...publicWhere },
    include: {
      experiences: {
        where: publicWhere,
        orderBy: { sortIndex: "asc" },
        include: { projects: { where: publicWhere, orderBy: [{ featured: "desc" }, { sortIndex: "asc" }] } },
      },
    },
  });
  if (!row) return null;
  const { experiences, ...education } = row;
  const projectsById = new Map(experiences.flatMap((e) => e.projects).map((p) => [p.id, p]));
  return {
    ...(await localizeRows("education", [education], lang))[0],
    experiences: await localizeRows(
      "experience",
      experiences.map(({ projects: _p, ...e }) => (void _p, e)),
      lang,
    ),
    projects: await localizeRows("projects", [...projectsById.values()], lang),
  };
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
  // Most relevant first. Contact is not a tab: the contact form lives in the footer of every page.
  return [
    tab("/", t.overview),
    ...(education ? [tab("/education", t.education)] : []),
    ...(experience ? [tab("/experience", t.experience)] : []),
    ...(projects ? [tab("/projects", t.projects)] : []),
    ...(skills ? [tab("/skills", t.skills)] : []),
  ];
}
