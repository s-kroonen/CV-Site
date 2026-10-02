import { prisma } from "@/lib/prisma";
import { publicWhere } from "@/lib/lifecycle";

// Public data access only. PrivateContact is deliberately never exposed here -
// see src/lib/private-contact.ts for the gated reveal flow.

export function getProfile() {
  return prisma.profile.findUnique({ where: { id: 1 } });
}

export function getExperience() {
  return prisma.experience.findMany({ where: publicWhere, orderBy: { sortIndex: "asc" } });
}

export function getEducation() {
  return prisma.education.findMany({ where: publicWhere, orderBy: { sortIndex: "asc" } });
}

export function getProjects() {
  return prisma.project.findMany({
    where: publicWhere,
    orderBy: [{ featured: "desc" }, { sortIndex: "asc" }],
  });
}

export function getProjectBySlug(slug: string) {
  return prisma.project.findFirst({ where: { slug, ...publicWhere } });
}

export function getSkills() {
  return prisma.skill.findMany({ where: publicWhere, orderBy: [{ category: "asc" }, { sortIndex: "asc" }] });
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
