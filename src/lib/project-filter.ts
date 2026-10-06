import { asStringArray } from "@/lib/json";

/** The statuses a project can have, in the order the filter chips are shown. */
export const STATUS_ORDER = ["ongoing", "on_hold", "completed", "experiment", "discontinued"] as const;

type Filterable = { title: string; summary: string; description?: string | null; category: string; status: string; techStack: unknown };

const norm = (value: string) => value.toLocaleLowerCase();

/** Does a project match what was typed? Every word must appear in the title, summary, category, status or tech tags. */
export function matchesQuery(project: Filterable, query: string, statusLabel = ""): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = norm(
    [project.title, project.summary, project.description ?? "", project.category, project.status, statusLabel, ...asStringArray(project.techStack)].join(" \n "),
  );
  return words.every((w) => haystack.includes(w));
}

/** Search text and status filter ("" = any status). `labels` maps a status to its visible label so people can search "ongoing". */
export function filterProjects<T extends Filterable>(items: T[], opts: { query: string; status: string; labels?: Record<string, string> }): T[] {
  return items.filter((p) => (!opts.status || p.status === opts.status) && matchesQuery(p, opts.query, opts.labels?.[p.status] ?? ""));
}

/** How many projects have each status (statuses that do not occur are left out). */
export function statusCounts(items: { status: string }[]): { status: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of items) if (p.status) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
  return [...STATUS_ORDER, ...[...counts.keys()].filter((s) => !(STATUS_ORDER as readonly string[]).includes(s))]
    .filter((s) => counts.has(s))
    .map((status) => ({ status, count: counts.get(status)! }));
}
