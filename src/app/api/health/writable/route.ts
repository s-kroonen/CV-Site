import { readSyncStatus, syncConfigured, writableNow } from "@/lib/site-role";

export const dynamic = "force-dynamic";

/** 200 only while this host may accept edits. Use it as the health check of the write routes in the reverse proxy. */
export async function GET() {
  if (!syncConfigured()) return Response.json({ writable: true });
  const status = readSyncStatus();
  const writable = writableNow(status);
  return Response.json({ writable, reason: status?.reason ?? "starting" }, { status: writable ? 200 : 503 });
}
