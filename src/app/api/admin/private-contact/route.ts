import { prisma } from "@/lib/prisma";
import { privateContactSchema, formatZodError } from "@/lib/admin-schemas";

export async function PUT(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = privateContactSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const updated = await prisma.privateContact.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });

  return Response.json(updated);
}
