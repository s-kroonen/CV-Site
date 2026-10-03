import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/json";

// Suggestion pools for the admin tag inputs. Tags live as JSON string arrays on
// Experience.tags / Project.techStack, so the pool is the distinct union of
// everything already used (case-insensitive), most-used first.
// Auth: covered by the /api/admin matcher in src/proxy.ts.
export async function GET(request: Request) {
  const pool = new URL(request.url).searchParams.get("pool");

  const counts = new Map<string, { label: string; n: number }>();
  const add = (raw: string) => {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label) return;
    const key = label.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.n++;
    else counts.set(key, { label, n: 1 });
  };

  if (pool === "projectCategories") {
    const projects = await prisma.project.findMany({ where: { deletedAt: null }, select: { category: true } });
    projects.forEach((p) => add(p.category));
  } else if (pool === "categories") {
    const skills = await prisma.skill.findMany({ where: { deletedAt: null }, select: { category: true } });
    skills.forEach((s) => add(s.category));
  } else {
    const [experience, projects] = await Promise.all([
      prisma.experience.findMany({ where: { deletedAt: null }, select: { tags: true } }),
      prisma.project.findMany({ where: { deletedAt: null }, select: { techStack: true } }),
    ]);
    experience.forEach((e) => asStringArray(e.tags).forEach(add));
    projects.forEach((p) => asStringArray(p.techStack).forEach(add));
  }

  const items = [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).map((e) => e.label);
  return Response.json({ items });
}
