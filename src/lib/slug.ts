import { prisma } from "@/lib/prisma";

export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[^\x00-\x7f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
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

type SlugModel = "experience" | "education";

/** A free slug for an experience/education item (`base`, `base-2`, ...). */
export async function uniqueItemSlug(model: SlugModel, base: string, excludeId?: string): Promise<string> {
  const delegate = (model === "experience" ? prisma.experience : prisma.education) as unknown as {
    findUnique(a: object): Promise<{ id: string } | null>;
  };
  let candidate = base;
  for (let n = 2; ; n++) {
    const existing = await delegate.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${n}`;
  }
}

/**
 * Gives every experience/education item without a slug one (from title + company, or degree +
 * institution). Existing slugs never change, so detail-page URLs stay stable when text is edited.
 */
export async function ensureItemSlugs(): Promise<void> {
  const [exp, edu] = await Promise.all([
    prisma.experience.findMany({ where: { slug: null }, select: { id: true, title: true, company: true } }),
    prisma.education.findMany({ where: { slug: null }, select: { id: true, degree: true, institution: true } }),
  ]);
  for (const e of exp) {
    const slug = await uniqueItemSlug("experience", slugify([e.title, e.company].filter(Boolean).join(" ")), e.id);
    await prisma.experience.update({ where: { id: e.id }, data: { slug } });
  }
  for (const e of edu) {
    const slug = await uniqueItemSlug("education", slugify([e.degree, e.institution].filter(Boolean).join(" ")), e.id);
    await prisma.education.update({ where: { id: e.id }, data: { slug } });
  }
}
