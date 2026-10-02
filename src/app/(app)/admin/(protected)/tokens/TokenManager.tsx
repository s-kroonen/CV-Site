"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError, SubmitButton, readApiError } from "@/components/admin/fields";

export type TokenRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "never");

export function TokenManager({ tokens }: { tokens: TokenRow[] }) {
  const router = useRouter();
  const [write, setWrite] = useState(false);
  const [priv, setPriv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    const data = new FormData(form);
    const days = String(data.get("days") ?? "").trim();
    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        scopes: ["read", ...(write ? ["write"] : []), ...(priv ? ["private"] : [])],
        expiresInDays: days ? Number(days) : null,
      }),
    });
    setPending(false);
    if (!res.ok) return setError(await readApiError(res, "Could not create the token."));
    setCreated((await res.json()).token);
    setCopied(false);
    form.reset();
    router.refresh();
  }

  async function revoke(t: TokenRow) {
    if (!window.confirm(`Revoke "${t.name}"? Any AI tool using it stops working immediately.`)) return;
    await fetch(`/api/admin/tokens/${t.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-ink-muted">
        Lets an AI tool (Claude Desktop, Claude Code, ...) read and edit your content through the MCP endpoint at{" "}
        <code>/api/mcp</code>. Each tool gets its own token; revoke one without affecting the others. Setup instructions
        are in <code>docs/MCP.md</code>.
      </p>

      {created && (
        <div className="flex flex-col gap-2 rounded-md border border-accent p-4 text-sm">
          <p className="font-medium">Copy your token now - it will not be shown again.</p>
          <code className="break-all rounded bg-accent/10 p-2">{created}</code>
          <div className="flex gap-3">
            <button
              type="button"
              className="w-fit text-sm underline underline-offset-4"
              onClick={async () => {
                await navigator.clipboard.writeText(created).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" className="w-fit text-sm underline underline-offset-4" onClick={() => setCreated(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">New token</h2>
        <Field label="Name" name="name" required hint="Which tool or machine this is for, e.g. Claude Desktop (laptop)." />
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 text-ink-muted">Access</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked disabled readOnly /> Read content (always on)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} className="accent-[var(--accent)]" />
            Add, edit, archive and trash content, upload images
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} className="accent-[var(--accent)]" />
            Private contact details (private email and phone)
          </label>
        </fieldset>
        <Field label="Expires after (days)" name="days" type="number" hint="Leave blank for no expiry." />
        <FormError message={error} />
        <SubmitButton pending={pending} pendingLabel="Creating…">
          Create token
        </SubmitButton>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tokens</h2>
        <ul className="flex flex-col gap-3">
          {tokens.map((t) => (
            <li
              key={t.id}
              className={`flex items-start justify-between gap-4 rounded-md border border-line px-4 py-3 ${t.revoked ? "opacity-50" : ""}`}
            >
              <div className="flex min-w-0 flex-col text-sm">
                <span className="font-medium">
                  {t.name} {t.revoked && <em className="font-normal">(revoked)</em>}
                </span>
                <span className="font-mono text-xs text-ink-muted">{t.prefix}…</span>
                <span className="text-ink-muted">
                  {t.scopes.join(", ")} · last used {fmt(t.lastUsedAt)}
                  {t.expiresAt ? ` · expires ${fmt(t.expiresAt)}` : ""}
                </span>
              </div>
              {!t.revoked && (
                <button
                  type="button"
                  onClick={() => revoke(t)}
                  className="shrink-0 text-sm text-red-600 underline underline-offset-4 dark:text-red-400"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
          {tokens.length === 0 && <p className="text-sm text-ink-muted">No tokens yet.</p>}
        </ul>
      </section>
    </div>
  );
}
