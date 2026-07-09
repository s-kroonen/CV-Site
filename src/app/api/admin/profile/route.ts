import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/admin-schemas";

export async function PUT(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.profile.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });

  return Response.json(updated);
}
