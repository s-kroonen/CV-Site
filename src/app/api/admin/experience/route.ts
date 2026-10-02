import { prisma } from "@/lib/prisma";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { experienceSchema, formatZodError } from "@/lib/admin-schemas";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = experienceSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { startDate, endDate, ...rest } = parsed.data;
  const created = await prisma.experience.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  const translation = await saveAdminTranslation("experience", created.id, created, json);
  return Response.json({ ...created, translation }, { status: 201 });
}
