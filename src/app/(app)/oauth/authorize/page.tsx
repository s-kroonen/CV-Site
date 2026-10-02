import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-session";
import { parseAuthRequest } from "@/lib/oauth";
import { ConsentForm } from "./ConsentForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Authorize access", robots: { index: false } };

type Params = Record<string, string | undefined>;

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
      <ConsentForm
        hidden={hidden}
        defaults={{
          write: request.requested.length === 0 || request.requested.includes("write"),
          private: request.requested.includes("private"),
        }}
      />
    </Card>
  );
}
