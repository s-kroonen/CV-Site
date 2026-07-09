import { prisma } from "@/lib/prisma";
import { skillSchema } from "@/lib/admin-schemas";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = skillSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.skill.create({ data: parsed.data });
  return Response.json(created, { status: 201 });
}
