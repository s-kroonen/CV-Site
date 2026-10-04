import Database from "better-sqlite3";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { dbFilePath } from "@/lib/db-path";
import { resetPrismaClient } from "@/lib/prisma";
import {
  isPreferred,
  peerUrl,
  stateFile,
  syncIntervalMs,
  syncToken,
  writeSyncStatus,
  type SyncStatus,
} from "@/lib/site-role";
import { createSnapshot, ensureRevisionSeeded, readLocalState, sha256File, UPLOAD_NAME, type LocalState, type UploadEntry } from "@/lib/sync";
import { uploadDir } from "@/lib/uploads";

/** What the other host reports about itself on /api/sync/state. */
export type PeerState = { token: string; revision: number; preferred: boolean; ready: boolean; canWrite: boolean; base?: string | null };

export type Decision = "in-sync" | "pull" | "wait" | "conflict";

/**
 * Compares the local data with the peer's. `base` is the state marker both hosts last agreed on (null if they never did).
 *  - same marker: nothing to do
 *  - only the peer changed since base: pull its data
 *  - only we changed: wait, the peer pulls from us
 *  - both changed: conflict, nothing is overwritten
 * With no common base, an empty side adopts the other; otherwise the standby adopts the preferred host's data.
 */
export function decide(me: LocalState, peer: Pick<PeerState, "token" | "revision" | "base">, base: string | null, preferred: boolean): Decision {
  if (me.token === peer.token) return "in-sync";
  // We never recorded an agreement, but the peer did and it was with exactly our current data: it only moved on.
  if (base === null && peer.base && peer.base === me.token) return "pull";
  if (base === null) {
    if (peer.revision === 0) return "wait";
    if (me.revision === 0) return "pull";
    return preferred ? "wait" : "pull";
  }
  if (me.token === base) return "pull";
  if (peer.token === base) return "wait";
  return "conflict";
}

/** Whether this instance may accept edits right now, and why (or why not). */
export function computeWritable(i: {
  preferred: boolean;
  ready: boolean;
  conflict: boolean;
  peerReachable: boolean;
  decision: Decision | null;
  baseKnown: boolean;
}): { canWrite: boolean; reason: string } {
  if (!i.ready) return { canWrite: false, reason: "starting" };
  if (i.conflict) return { canWrite: false, reason: "both hosts changed independently - resolve the conflict" };
  if (i.preferred) {
    if (i.peerReachable && i.decision === "pull") return { canWrite: false, reason: "catching up with the other host" };
    return { canWrite: true, reason: "main host" };
  }
  if (i.peerReachable) return { canWrite: false, reason: "the main host is up" };
  if (!i.baseKnown) return { canWrite: false, reason: "never synced with the main host" };
  return { canWrite: true, reason: "main host unreachable, standby is taking edits" };
}

class PeerHttpError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`${path}: HTTP ${status}`);
  }
}

/** A thrown PeerHttpError means the peer answered (so it is up); any other error means it could not be reached. */
async function peerGet(pathname: string, timeoutMs: number): Promise<Response> {
  const res = await fetch(`${peerUrl()}${pathname}`, {
    headers: { Authorization: `Bearer ${syncToken()}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new PeerHttpError(res.status, pathname);
  return res;
}

export async function loadBase(): Promise<string | null> {
  try {
    const parsed = JSON.parse(await readFile(stateFile(), "utf8")) as { baseToken?: string };
    return parsed.baseToken ?? null;
  } catch {
    return null;
  }
}

async function saveBase(baseToken: string) {
  await writeFile(stateFile(), JSON.stringify({ baseToken }));
}

/** Names of the finished migrations in a database file: the schema version of the code that last ran on it. */
function appliedMigrations(file: string): string[] {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    return db.prepare("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name").all().map((r) => (r as { migration_name: string }).migration_name);
  } finally {
    db.close();
  }
}

/** Puts a verified database file in place of the live one and makes the app reopen it. */
export async function applyDatabaseFile(incoming: string, expectedSha256: string): Promise<void> {
  const actual = await sha256File(incoming);
  if (actual !== expectedSha256) {
    await rm(incoming, { force: true });
    throw new Error("Downloaded database does not match its checksum");
  }
  const target = dbFilePath();
  // Both hosts must run the same version: a database from newer (or older) code does not fit this code.
  const theirs = appliedMigrations(incoming).join("|");
  if (theirs !== appliedMigrations(target).join("|")) {
    await rm(incoming, { force: true });
    throw new Error("The other host runs a different version of the site (database schema differs). Deploy the same image on both hosts.");
  }
  await resetPrismaClient(); // release the file first (required on Windows; harmless elsewhere)
  await rename(incoming, target); // atomic: any connection still open keeps the old file until it reconnects
  await Promise.all(["-wal", "-shm", "-journal"].map((suffix) => rm(`${target}${suffix}`, { force: true })));
  await resetPrismaClient();
}

/** Copies the peer's uploads (images first, so the new database never points at a missing one) and then its database. */
export async function pullFromPeer(): Promise<{ uploadsFetched: number; uploadsRemoved: number }> {
  const uploads = (await (await peerGet("/api/sync/uploads", 15_000)).json()) as UploadEntry[];
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const local = new Map<string, number>();
  for (const name of await readdir(dir).catch(() => [] as string[])) {
    if (UPLOAD_NAME.test(name)) local.set(name, (await stat(path.join(dir, name))).size);
  }
  let uploadsFetched = 0;
  for (const entry of uploads) {
    if (!UPLOAD_NAME.test(entry.name) || local.get(entry.name) === entry.size) continue;
    const bytes = Buffer.from(await (await peerGet(`/api/sync/uploads/${entry.name}`, 60_000)).arrayBuffer());
    if (bytes.length !== entry.size) throw new Error(`Upload ${entry.name} arrived incomplete`);
    const tmp = path.join(dir, `.incoming-${entry.name}`);
    await writeFile(tmp, bytes);
    await rename(tmp, path.join(dir, entry.name));
    uploadsFetched += 1;
  }
  const wanted = new Set(uploads.map((u) => u.name));
  let uploadsRemoved = 0;
  for (const name of local.keys()) {
    if (!wanted.has(name)) {
      await rm(path.join(dir, name), { force: true });
      uploadsRemoved += 1;
    }
  }

  const res = await peerGet("/api/sync/db", 120_000);
  const incoming = `${dbFilePath()}.incoming`;
  await writeFile(incoming, Buffer.from(await res.arrayBuffer()));
  const sha = res.headers.get("x-snapshot-sha256");
  if (!sha) throw new Error("The peer sent no checksum for its database");
  await applyDatabaseFile(incoming, sha);
  return { uploadsFetched, uploadsRemoved };
}

/** Keeps a copy of the local data next to the database before it is replaced on purpose (SYNC_ON_CONFLICT=peer). */
async function keepLocalCopy(): Promise<string> {
  const snapshot = await createSnapshot();
  const target = `${dbFilePath()}.conflict-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  await rename(snapshot.file, target).catch(async () => {
    // rename can fail across devices (tmp dir vs data volume): fall back to copy
    await writeFile(target, await readFile(snapshot.file));
    await rm(snapshot.file, { force: true });
  });
  return target;
}

const engine = { ready: false, conflict: false, lastSyncAt: null as string | null, lastError: null as string | null, running: false };

/** Test helper: forget everything the loop remembers. */
export function resetEngineForTests() {
  Object.assign(engine, { ready: false, conflict: false, lastSyncAt: null, lastError: null, running: false });
}

/** One round: look at the peer, pull if it is ahead, work out whether this instance may write, publish the result. */
export async function syncRound(): Promise<SyncStatus> {
  const preferred = isPreferred();
  let peer: PeerState | null = null;
  let peerReachable = false;
  engine.lastError = null;

  try {
    peer = (await (await peerGet("/api/sync/state", 5_000)).json()) as PeerState;
    peerReachable = true;
  } catch (error) {
    peerReachable = error instanceof PeerHttpError; // it answered, just not with what we need
    engine.lastError = error instanceof Error ? error.message : String(error);
  }

  let me = await readLocalState();
  let base = await loadBase();
  let decision: Decision | null = null;

  if (peer) {
    decision = decide(me, peer, base, preferred);
    if (decision === "conflict") {
      if (process.env.SYNC_ON_CONFLICT === "peer") {
        const kept = await keepLocalCopy();
        console.warn(`[sync] conflict: local data saved to ${kept}, adopting the other host's data`);
        decision = "pull";
        engine.conflict = false;
      } else {
        engine.conflict = true;
        engine.lastError = "Both hosts changed independently. Set SYNC_ON_CONFLICT=peer on the host whose changes should be discarded.";
      }
    } else {
      engine.conflict = false;
    }

    if (decision === "pull") {
      try {
        const result = await pullFromPeer();
        console.log("[sync] pulled", JSON.stringify(result));
        engine.lastSyncAt = new Date().toISOString();
        decision = "in-sync";
      } catch (error) {
        engine.lastError = error instanceof Error ? error.message : String(error);
        console.error("[sync] pull failed:", engine.lastError);
      }
    } else if (decision === "in-sync") {
      engine.lastSyncAt = new Date().toISOString();
    }

    me = await readLocalState();
    if (decision === "in-sync") {
      base = me.token;
      await saveBase(base);
    }
  }

  engine.ready = true; // the first round has finished, successfully or not
  const { canWrite, reason } = computeWritable({
    preferred,
    ready: true,
    conflict: engine.conflict,
    peerReachable,
    decision,
    baseKnown: base !== null,
  });
  const status: SyncStatus = {
    ready: true,
    canWrite,
    conflict: engine.conflict,
    reason,
    preferred,
    peerReachable,
    token: me.token,
    peerToken: peer?.token ?? null,
    lastSyncAt: engine.lastSyncAt,
    lastError: engine.lastError,
    updatedAt: Date.now(),
  };
  writeSyncStatus(status);
  return status;
}

async function safeRound() {
  if (engine.running) return;
  engine.running = true;
  try {
    await syncRound();
  } catch (error) {
    engine.lastError = error instanceof Error ? error.message : String(error);
    console.error("[sync] round failed:", engine.lastError);
  } finally {
    engine.running = false;
  }
}

/** Called once at server start. Until the first round has finished the instance answers 503. */
export function startSyncEngine() {
  writeSyncStatus({
    ready: false,
    canWrite: false,
    conflict: false,
    reason: "starting",
    preferred: isPreferred(),
    peerReachable: false,
    token: null,
    peerToken: null,
    lastSyncAt: null,
    lastError: null,
    updatedAt: Date.now(),
  });
  void (async () => {
    try {
      await ensureRevisionSeeded();
    } catch (error) {
      console.error("[sync] could not read the database state:", error);
    }
    await safeRound();
    setInterval(() => void safeRound(), syncIntervalMs()).unref();
  })();
}
