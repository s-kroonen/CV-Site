import { prisma } from "@/lib/prisma";

/** Empties every content table (links and translations first) so each test starts clean. */
export async function resetDb() {
  await prisma.translation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.oAuthGrant.deleteMany();
  await prisma.oAuthCode.deleteMany();
  await prisma.oAuthClient.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.education.deleteMany();
  await prisma.project.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.privateContact.deleteMany();
}
