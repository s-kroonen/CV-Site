import { prisma } from "@/lib/prisma";
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

  return Response.json(created, { status: 201 });
}
