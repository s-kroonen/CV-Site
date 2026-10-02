import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-session";
import { parseAuthRequest } from "@/lib/oauth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Authorize access", robots: { index: false } };

type Params = Record<string, string | undefined>;

const SCOPE_COPY: Record<string, string> = {
  read: "Read your CV content",
  write: "Add, edit, archive and trash content, upload images",
  private: "Read and change your private email and phone",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-6 py-16">{children}</main>
  );
}

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const params: Params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v as string | undefined)]),
  );

  const parsed = await parseAuthRequest(params);
  if (parsed.kind === "fatal") {
    return (
      <Card>
        <h1 className="text-2xl font-semibold">Can&apos;t authorize</h1>
        <p className="text-ink-muted">{parsed.message}</p>
      </Card>
    );
  }
  if (parsed.kind === "redirect_error") {
    const url = new URL(parsed.redirectUri);
    url.searchParams.set("error", parsed.error);
    if (parsed.state) url.searchParams.set("state", parsed.state);
    redirect(url.toString());
  }

  // Only the site owner can approve: send them through the passkey login and back here.
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSession(session)) {
    const back = `/oauth/authorize?${new URLSearchParams(params as Record<string, string>).toString()}`;
    redirect(`/admin/login?next=${encodeURIComponent(back)}`);
  }

  const { request } = parsed;
  const host = new URL(request.redirectUri).host;
  const hidden: Record<string, string> = {
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    code_challenge: request.codeChallenge,
    response_type: "code",
    code_challenge_method: "S256",
    ...(request.state ? { state: request.state } : {}),
  };

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Connect {request.clientName}?</h1>
      <p className="text-ink-muted">
        <strong className="text-ink">{request.clientName}</strong> wants to access your CV site on your behalf. It will
        return to <code>{host}</code> after you decide.
      </p>
      <form method="post" action="/oauth/authorize/decision" className="flex flex-col gap-5">
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 text-ink-muted">Allow it to:</legend>
          {(["read", "write", "private"] as const).map((scope) => (
            <label key={scope} className="flex items-start gap-2">
              <input
                type="checkbox"
                name="scope"
                value={scope}
                defaultChecked={scope === "read" || (scope === "write" && (request.requested.length === 0 || request.requested.includes("write"))) || (scope === "private" && request.requested.includes("private"))}
                disabled={scope === "read"}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>{SCOPE_COPY[scope]}</span>
            </label>
          ))}
          <input type="hidden" name="scope" value="read" />
        </fieldset>
        <div className="flex gap-3">
          <button
            type="submit"
            name="decision"
            value="approve"
            className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Approve
          </button>
          <button type="submit" name="decision" value="deny" className="rounded-md border border-line px-5 py-2 text-sm hover:border-accent">
            Deny
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          You can disconnect it any time under Admin → AI access. Only approve apps you started connecting yourself.
        </p>
      </form>
    </Card>
  );
}
