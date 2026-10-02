import { prisma } from "@/lib/prisma";
import { parseView, viewCounts, viewWhere } from "@/lib/lifecycle";
import { EntityList } from "@/components/admin/EntityList";

export const dynamic = "force-dynamic";

export default async function AdminSkillsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = parseView((await searchParams).view);
  const [items, counts] = await Promise.all([
    prisma.skill.findMany({ where: viewWhere[view], orderBy: [{ category: "asc" }, { sortIndex: "asc" }] }),
    viewCounts("skills"),
  ]);

  return (
    <EntityList
      entity="skills"
      title="Skills"
      view={view}
      counts={counts}
      items={items.map((item) => ({ id: item.id, label: [item.name, item.category, item.proficiency != null ? `${item.proficiency}%` : ""].filter(Boolean).join(" · ") || "(untitled)" }))}
    />
  );
}
