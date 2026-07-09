import { prisma } from "@/lib/prisma";

// Public data access only. PrivateContact is deliberately never exposed here -
// see src/lib/private-contact.ts for the gated reveal flow.

export function getProfile() {
  return prisma.profile.findUnique({ where: { id: 1 } });
}

export function getExperience() {
  return prisma.experience.findMany({ orderBy: { sortIndex: "asc" } });
}

export function getEducation() {
  return prisma.education.findMany({ orderBy: { sortIndex: "asc" } });
}

export function getProjects() {
  return prisma.project.findMany({
    where: { status: "active" },
    orderBy: [{ featured: "desc" }, { sortIndex: "asc" }],
  });
}

export function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({ where: { slug } });
}

export function getSkills() {
  return prisma.skill.findMany({ orderBy: [{ category: "asc" }, { sortIndex: "asc" }] });
}
