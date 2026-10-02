import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/json";
import { TokenManager, type TokenRow } from "./TokenManager";
import { GrantList, type GrantRow } from "./GrantList";

export const dynamic = "force-dynamic";

export default async function AdminTokensPage() {
  const [tokens, activity, grantRows] = await Promise.all([
    prisma.apiToken.findMany({ where: { grantId: null }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 50 }),
    prisma.oAuthGrant.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);

  const grants: GrantRow[] = grantRows.map((g) => ({
    id: g.id,
    clientName: g.clientName,
    scopes: asStringArray(g.scopes),
    createdAt: g.createdAt.toISOString(),
    lastUsedAt: g.lastUsedAt?.toISOString() ?? null,
  }));

  const rows: TokenRow[] = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scopes: asStringArray(t.scopes),
    createdAt: t.createdAt.toISOString(),
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    revoked: !!t.revokedAt,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <h1 className="text-2xl font-semibold">AI access (MCP)</h1>
      <GrantList grants={grants} />
      <TokenManager tokens={rows} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing yet. Reads are not logged; changes and failed calls are.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3 border-b border-line py-1.5">
                <span className="text-ink-muted">{a.at.toLocaleString()}</span>
                <span>{a.actor}</span>
                <span className="font-mono text-xs">{a.tool}</span>
                {a.entity && <span className="text-ink-muted">{a.entity}</span>}
                {!a.ok && <span className="text-red-600 dark:text-red-400">failed{a.detail ? `: ${a.detail}` : ""}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
