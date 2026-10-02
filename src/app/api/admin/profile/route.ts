import { prisma } from "@/lib/prisma";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { profileSchema, formatZodError } from "@/lib/admin-schemas";

export async function PUT(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const updated = await prisma.profile.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });

  const translation = await saveAdminTranslation("profile", "1", updated, json);
  return Response.json({ ...updated, translation });
}
