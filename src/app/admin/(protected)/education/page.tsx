import { prisma } from "@/lib/prisma";
import { parseView, viewCounts, viewWhere } from "@/lib/lifecycle";
import { EntityList } from "@/components/admin/EntityList";

export const dynamic = "force-dynamic";

export default async function AdminEducationPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = parseView((await searchParams).view);
  const [items, counts] = await Promise.all([
    prisma.education.findMany({ where: viewWhere[view], orderBy: { sortIndex: "asc" } }),
    viewCounts("education"),
  ]);

  return (
    <EntityList
      entity="education"
      title="Education"
      view={view}
      counts={counts}
      items={items.map((item) => ({ id: item.id, label: [item.degree, item.institution].filter(Boolean).join(" · ") || "(untitled)" }))}
    />
  );
}
