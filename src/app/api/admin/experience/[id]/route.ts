import { prisma } from "@/lib/prisma";
import { experienceSchema, formatZodError } from "@/lib/admin-schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = experienceSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { startDate, endDate, ...rest } = parsed.data;
  const updated = await prisma.experience.update({
    where: { id },
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.experience.delete({ where: { id } });
  return Response.json({ ok: true });
}
