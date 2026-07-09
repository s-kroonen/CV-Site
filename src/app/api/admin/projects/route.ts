import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/admin-schemas";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { repoUrl, liveUrl, ...rest } = parsed.data;

  try {
    const created = await prisma.project.create({
      data: { ...rest, repoUrl: repoUrl || null, liveUrl: liveUrl || null },
    });
    return Response.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ error: "That slug is already in use." }, { status: 409 });
    }
    throw err;
  }
}
