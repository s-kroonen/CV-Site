import Link from "next/link";
import type { Entity, LifecycleView } from "@/lib/lifecycle";
import { EmptyTrashButton, LifecycleButton } from "./LifecycleActions";

export type ListItem = { id: string; label: string };

const TABS: { view: LifecycleView; label: string }[] = [
  { view: "active", label: "Active" },
  { view: "archived", label: "Archived" },
  { view: "trash", label: "Trash" },
];

const EMPTY: Record<LifecycleView, string> = {
  active: "Nothing here yet.",
  archived: "Nothing archived. Archive items that are outdated but worth keeping - they're hidden from the site.",
  trash: "Trash is empty.",
};

/** Shared admin list: Active / Archived / Trash tabs with per-row lifecycle actions. */
export function EntityList({
  entity,
  title,
  view,
  counts,
  items,
}: {
  entity: Entity;
  title: string;
  view: LifecycleView;
  counts: Record<LifecycleView, number>;
  items: ListItem[];
}) {
  const base = `/admin/${entity}`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Link href={`${base}/new`} className="text-sm underline underline-offset-4">
          + Add
        </Link>
      </div>

      <nav className="flex items-center gap-4 border-b border-line text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.view}
            href={tab.view === "active" ? base : `${base}?view=${tab.view}`}
            className={`-mb-px border-b-2 pb-2 ${
              view === tab.view ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label} <span className="text-xs opacity-70">{counts[tab.view]}</span>
          </Link>
        ))}
        {view === "trash" && (
          <span className="ml-auto pb-2">
            <EmptyTrashButton entity={entity} count={counts.trash} />
          </span>
        )}
      </nav>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3">
            <span className="min-w-0 truncate">{item.label}</span>
            <div className="flex shrink-0 gap-4">
              {view !== "trash" && (
                <Link href={`${base}/${item.id}`} className="text-sm underline underline-offset-4">
                  Edit
                </Link>
              )}
              {view === "active" && <LifecycleButton entity={entity} id={item.id} action="archive" label="Archive" />}
              {view === "archived" && <LifecycleButton entity={entity} id={item.id} action="unarchive" label="Restore" />}
              {view === "trash" && <LifecycleButton entity={entity} id={item.id} action="restore" label="Restore" />}
              {view === "trash" ? (
                <LifecycleButton
                  entity={entity}
                  id={item.id}
                  action="purge"
                  label="Delete forever"
                  confirmText={`Permanently delete "${item.label}"? This cannot be undone.`}
                  danger
                />
              ) : (
                <LifecycleButton entity={entity} id={item.id} action="trash" label="Delete" danger />
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-ink-muted">{EMPTY[view]}</p>}
      </ul>
    </main>
  );
}
