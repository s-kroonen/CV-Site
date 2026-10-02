"use client";

import { useState } from "react";

const SCOPE_COPY: Record<string, string> = {
  read: "Read your CV content",
  write: "Add, edit, archive and trash content, upload images",
  private: "Read and change your private email and phone",
};

/**
 * The decision is POSTed with fetch and the browser is then navigated to the
 * returned redirect. A plain <form> POST would be blocked: the site's CSP has
 * `form-action 'self'`, and browsers apply that to the redirect target too, so
 * a redirect to claude.ai (or any other client) would be refused.
 */
export function ConsentForm({
  hidden,
  defaults,
}: {
  hidden: Record<string, string>;
  defaults: { write: boolean; private: boolean };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget);
    form.set("decision", submitter?.value === "approve" ? "approve" : "deny");
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/oauth/authorize/decision", {
        method: "POST",
        body: new URLSearchParams(Array.from(form.entries()).map(([k, v]) => [k, String(v)])),
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || typeof body?.redirect !== "string") {
        throw new Error(res.status === 401 ? "Your admin session expired. Reload this page and sign in again." : "Something went wrong.");
      }
      window.location.assign(body.redirect);
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 text-ink-muted">Allow it to:</legend>
        <p className="flex items-start gap-2">
          <span aria-hidden="true" className="w-4 text-center text-accent">
            ✓
          </span>
          <span>{SCOPE_COPY.read} (always)</span>
        </p>
        {(["write", "private"] as const).map((scope) => (
          <label key={scope} className="flex items-start gap-2">
            <input type="checkbox" name="scope" value={scope} defaultChecked={defaults[scope]} className="mt-1 accent-[var(--accent)]" />
            <span>{SCOPE_COPY[scope]}</span>
          </label>
        ))}
        <input type="hidden" name="scope" value="read" />
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Redirecting…" : "Approve"}
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          disabled={pending}
          className="rounded-md border border-line px-5 py-2 text-sm hover:border-accent disabled:opacity-50"
        >
          Deny
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        You can disconnect it any time under Admin → AI access. Only approve apps you started connecting yourself.
      </p>
    </form>
  );
}
