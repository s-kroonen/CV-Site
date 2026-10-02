import { prisma } from "@/lib/prisma";

// Archive / trash lifecycle shared by the admin UI (and later the MCP server).
//   active   archivedAt = null, deletedAt = null   -> shown on the public site
//   archived archivedAt set,    deletedAt = null   -> hidden, kept for reference
//   trash    deletedAt set                         -> hidden, restorable until purged

export const ENTITIES = ["experience", "education", "projects", "skills"] as const;
export type Entity = (typeof ENTITIES)[number];
export type LifecycleAction = "archive" | "unarchive" | "trash" | "restore" | "purge";
export type LifecycleView = "active" | "archived" | "trash";

export const isEntity = (v: unknown): v is Entity => ENTITIES.includes(v as Entity);

export const viewWhere = {
  active: { archivedAt: null, deletedAt: null },
  archived: { archivedAt: { not: null }, deletedAt: null },
  trash: { deletedAt: { not: null } },
} as const;

export const publicWhere = viewWhere.active;

export function parseView(v: string | undefined): LifecycleView {
  return v === "archived" || v === "trash" ? v : "active";
}

// One delegate per entity. Typed loosely on purpose: the four Prisma delegates
// share these methods but have no common TS interface.
type Delegate = {
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
};

function delegate(entity: Entity): Delegate {
  switch (entity) {
    case "experience":
      return prisma.experience as unknown as Delegate;
    case "education":
      return prisma.education as unknown as Delegate;
    case "projects":
      return prisma.project as unknown as Delegate;
    case "skills":
      return prisma.skill as unknown as Delegate;
  }
}

export async function applyLifecycle(entity: Entity, id: string, action: LifecycleAction): Promise<void> {
  const d = delegate(entity);
  const now = new Date();
  switch (action) {
    case "archive":
      await d.update({ where: { id }, data: { archivedAt: now } });
      return;
    case "unarchive":
      await d.update({ where: { id }, data: { archivedAt: null } });
      return;
    case "trash":
      await d.update({ where: { id }, data: { deletedAt: now } });
      return;
    case "restore":
      // Restoring from the trash returns the item to wherever it was (active or archived).
      await d.update({ where: { id }, data: { deletedAt: null } });
      return;
    case "purge":
      await d.delete({ where: { id } });
      return;
  }
}

export async function emptyTrash(entity: Entity): Promise<number> {
  const { count } = await delegate(entity).deleteMany({ where: viewWhere.trash });
  return count;
}

export async function viewCounts(entity: Entity): Promise<Record<LifecycleView, number>> {
  const d = delegate(entity);
  const [active, archived, trash] = await Promise.all([
    d.count({ where: viewWhere.active }),
    d.count({ where: viewWhere.archived }),
    d.count({ where: viewWhere.trash }),
  ]);
  return { active, archived, trash };
}
