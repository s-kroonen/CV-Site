import { isPreferred, readSyncStatus, writableNow } from "@/lib/site-role";
import { authorizeSync, readLocalState } from "@/lib/sync";
import { loadBase } from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

/** Cheap summary the peer polls: which data state this host has and whether it is ready and allowed to write. */
export async function GET(request: Request) {
  const denied = authorizeSync(request);
  if (denied) return denied;
  const state = await readLocalState();
  const status = readSyncStatus();
  return Response.json({
    token: state.token,
    revision: state.revision,
    base: await loadBase(), // the data state this host last agreed on with its peer
    preferred: isPreferred(),
    ready: !!status?.ready,
    canWrite: writableNow(status),
  });
}
