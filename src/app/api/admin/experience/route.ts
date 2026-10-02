import { prisma } from "@/lib/prisma";
import { ensureItemSlugs } from "@/lib/slug";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { experienceSchema, formatZodError } from "@/lib/admin-schemas";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = experienceSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { startDate, endDate, projectIds, educationIds, ...rest } = parsed.data;
  const created = await prisma.experience.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      projects: projectIds ? { connect: projectIds.map((id) => ({ id })) } : undefined,
      education: educationIds ? { connect: educationIds.map((id) => ({ id })) } : undefined,
    },
  });

  await ensureItemSlugs();
  const translation = await saveAdminTranslation("experience", created.id, created, json);
  return Response.json({ ...created, translation }, { status: 201 });
}
