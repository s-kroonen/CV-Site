import { prisma } from "@/lib/prisma";
import { parseView, viewCounts, viewWhere } from "@/lib/lifecycle";
import { EntityList } from "@/components/admin/EntityList";

export const dynamic = "force-dynamic";

export default async function AdminExperiencePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = parseView((await searchParams).view);
  const [items, counts] = await Promise.all([
    prisma.experience.findMany({ where: viewWhere[view], orderBy: { sortIndex: "asc" } }),
    viewCounts("experience"),
  ]);

  return (
    <EntityList
      entity="experience"
      title="Experience"
      view={view}
      counts={counts}
      items={items.map((item) => ({ id: item.id, label: [item.title, item.company].filter(Boolean).join(" · ") || "(untitled)" }))}
    />
  );
}
