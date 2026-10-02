import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { saveAdminTranslation } from "@/lib/admin-translation";
import { projectSchema, formatZodError } from "@/lib/admin-schemas";
import { slugify, uniqueProjectSlug } from "@/lib/slug";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { repoUrl, liveUrl, slug, ...rest } = parsed.data;
  // Blank slug -> derived from the title; an explicit one is kept as typed (collision -> 409 below).
  const finalSlug = slug || (await uniqueProjectSlug(slugify(rest.title)));

  try {
    const created = await prisma.project.create({
      data: { ...rest, slug: finalSlug, repoUrl: repoUrl || null, liveUrl: liveUrl || null },
    });
    const translation = await saveAdminTranslation("projects", created.id, created, json);
    return Response.json({ ...created, translation }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ error: "That slug is already in use." }, { status: 409 });
    }
    throw err;
  }
}
