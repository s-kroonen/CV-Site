import { applyLifecycle } from "@/lib/lifecycle";
import { prisma } from "@/lib/prisma";
import { ensureItemSlugs } from "@/lib/slug";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { experienceSchema, formatZodError } from "@/lib/admin-schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = experienceSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { startDate, endDate, projectIds, educationIds, ...rest } = parsed.data;
  const updated = await prisma.experience.update({
    where: { id },
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      projects: projectIds ? { set: projectIds.map((id) => ({ id })) } : undefined,
      education: educationIds ? { set: educationIds.map((id) => ({ id })) } : undefined,
    },
  });

  await ensureItemSlugs();
  const translation = await saveAdminTranslation("experience", id, updated, json);
  return Response.json({ ...updated, translation });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await applyLifecycle("experience", id, "trash");
  return Response.json({ ok: true });
}
