import { prisma } from "@/lib/prisma";
import { experienceSchema } from "@/lib/admin-schemas";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = experienceSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, endDate, ...rest } = parsed.data;
  const created = await prisma.experience.create({
    data: {
      ...rest,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  return Response.json(created, { status: 201 });
}
