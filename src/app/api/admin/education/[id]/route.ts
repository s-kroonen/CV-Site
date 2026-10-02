import { applyLifecycle } from "@/lib/lifecycle";
import { prisma } from "@/lib/prisma";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { educationSchema, formatZodError } from "@/lib/admin-schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = educationSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { startDate, endDate, ...rest } = parsed.data;
  const updated = await prisma.education.update({
    where: { id },
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  const translation = await saveAdminTranslation("education", id, updated, json);
  return Response.json({ ...updated, translation });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await applyLifecycle("education", id, "trash");
  return Response.json({ ok: true });
}
