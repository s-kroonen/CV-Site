import { readSyncStatus, syncConfigured } from "@/lib/site-role";

export const dynamic = "force-dynamic";

/**
 * Liveness for the reverse proxy. With two-host sync it answers 503 until the first sync round has finished,
 * so traffic keeps going to the other host while this one catches up.
 */
export async function GET() {
  const host = process.env.SITE_NAME?.trim() || null;
  const version = process.env.BUILD_SHA?.slice(0, 7) || null; // commit the running image was built from
  if (!syncConfigured()) return Response.json({ status: "ok", sync: false, host, version });
  const status = readSyncStatus();
  const ready = !!status?.ready;
  return Response.json(
    {
      status: ready ? "ok" : "syncing",
      sync: true,
      host,
      version,
      role: status?.preferred === false ? "standby" : "preferred",
      canWrite: !!status?.canWrite,
      reason: status?.reason ?? "starting",
      conflict: status?.conflict ?? false,
      peerReachable: status?.peerReachable ?? false,
      lastSyncAt: status?.lastSyncAt ?? null,
      error: status?.lastError ?? null,
    },
    { status: ready ? 200 : 503 },
  );
}
