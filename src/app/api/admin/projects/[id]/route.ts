import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/admin-schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { repoUrl, liveUrl, ...rest } = parsed.data;

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { ...rest, repoUrl: repoUrl || null, liveUrl: liveUrl || null },
    });
    return Response.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ error: "That slug is already in use." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return Response.json({ ok: true });
}
