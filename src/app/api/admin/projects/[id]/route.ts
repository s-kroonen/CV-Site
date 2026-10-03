import { Prisma } from "@/generated/prisma/client";
import { applyLifecycle } from "@/lib/lifecycle";
import { prisma } from "@/lib/prisma";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { projectSchema, formatZodError } from "@/lib/admin-schemas";
import { slugify, uniqueProjectSlug } from "@/lib/slug";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { repoUrl, liveUrl, slug, experienceIds, startDate, endDate, ...rest } = parsed.data;
  // Blank slug -> derived from the title; an explicit one is kept as typed (collision -> 409 below).
  const finalSlug = slug || (await uniqueProjectSlug(slugify(rest.title), id));

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        slug: finalSlug,
        repoUrl: repoUrl || null,
        liveUrl: liveUrl || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        experiences: experienceIds ? { set: experienceIds.map((id) => ({ id })) } : undefined,
      },
    });
    const translation = await saveAdminTranslation("projects", id, updated, json);
    return Response.json({ ...updated, translation });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ error: "That slug is already in use." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await applyLifecycle("projects", id, "trash");
  return Response.json({ ok: true });
}
