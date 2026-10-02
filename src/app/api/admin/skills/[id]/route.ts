import { applyLifecycle } from "@/lib/lifecycle";
import { prisma } from "@/lib/prisma";
import { skillSchema, formatZodError } from "@/lib/admin-schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = skillSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const updated = await prisma.skill.update({ where: { id }, data: parsed.data });
  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await applyLifecycle("skills", id, "trash");
  return Response.json({ ok: true });
}
