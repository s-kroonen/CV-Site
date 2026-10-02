"use client";

import { useRouter } from "next/navigation";

export type GrantRow = { id: string; clientName: string; scopes: string[]; createdAt: string; lastUsedAt: string | null };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "never");

/** Apps connected through the OAuth sign-in flow (claude.ai, Claude Desktop, ...). */
export function GrantList({ grants }: { grants: GrantRow[] }) {
  const router = useRouter();

  async function disconnect(g: GrantRow) {
    if (!window.confirm(`Disconnect "${g.clientName}"? It loses access immediately.`)) return;
    await fetch(`/api/admin/grants/${g.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Connected apps</h2>
      <p className="text-sm text-ink-muted">
        Apps you approved through the sign-in screen. They get short-lived access that renews itself until you
        disconnect them.
      </p>
      <ul className="flex flex-col gap-3">
        {grants.map((g) => (
          <li key={g.id} className="flex items-start justify-between gap-4 rounded-md border border-line px-4 py-3">
            <div className="flex min-w-0 flex-col text-sm">
              <span className="font-medium">{g.clientName}</span>
              <span className="text-ink-muted">
                {g.scopes.join(", ")} · connected {fmt(g.createdAt)} · last used {fmt(g.lastUsedAt)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => disconnect(g)}
              className="shrink-0 text-sm text-red-600 underline underline-offset-4 dark:text-red-400"
            >
              Disconnect
            </button>
          </li>
        ))}
        {grants.length === 0 && <p className="text-sm text-ink-muted">No apps connected.</p>}
      </ul>
    </section>
  );
}
