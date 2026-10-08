import { prisma } from "@/lib/prisma";
import { parseView, viewCounts, viewWhere } from "@/lib/lifecycle";
import { EntityList } from "@/components/admin/EntityList";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = parseView((await searchParams).view);
  const [items, counts] = await Promise.all([
    prisma.project.findMany({ where: viewWhere[view], orderBy: [{ featured: "desc" }, { sortIndex: "asc" }] }),
    viewCounts("projects"),
  ]);

  return (
    <EntityList
      entity="projects"
      title="Projects"
      view={view}
      counts={counts}
      items={items.map((item) => ({ id: item.id, label: item.title || "(untitled)", keywords: Array.isArray(item.techStack) ? item.techStack.map(String) : [] }))}
    />
  );
}
