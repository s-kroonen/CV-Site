import { prisma } from "@/lib/prisma";

export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[^\x00-\x7f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "project"
  );
}

/** Returns `base`, or `base-2`, `base-3`... until it doesn't collide with another project. */
export async function uniqueProjectSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  for (let n = 2; ; n++) {
    const existing = await prisma.project.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${n}`;
  }
}
