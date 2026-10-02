import { prisma } from "@/lib/prisma";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { skillSchema, formatZodError } from "@/lib/admin-schemas";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = skillSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const created = await prisma.skill.create({ data: parsed.data });
  const translation = await saveAdminTranslation("skills", created.id, created, json);
  return Response.json({ ...created, translation }, { status: 201 });
}
