import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dbFilePath } from "@/lib/db-path";

/**
 * Two-host redundancy (docs/REDUNDANCY.md). Both instances can write, but only one at a time:
 *  - the "preferred" instance writes whenever it is up and up to date;
 *  - the "standby" instance writes only when it cannot reach the preferred one.
 * Without SYNC_PEER_URL the site runs standalone and none of this applies.
 */
export const peerUrl = () => (process.env.SYNC_PEER_URL ?? "").replace(/\/+$/, "");
export const syncToken = () => process.env.SYNC_TOKEN?.trim() ?? "";
export const syncConfigured = () => peerUrl() !== "" && syncToken().length >= 32;
export const isPreferred = () => (process.env.SITE_ROLE ?? "preferred") !== "standby";
export const syncIntervalMs = () => Math.max(5, Number(process.env.SYNC_INTERVAL_SECONDS) || 15) * 1000;

/** What this instance currently knows about itself and its peer. Written by the sync loop, read everywhere. */
export type SyncStatus = {
  ready: boolean; // first sync round finished: until then the instance answers 503
  canWrite: boolean; // allowed to accept edits, logins and messages right now
  conflict: boolean; // both hosts changed independently; nothing is overwritten until resolved
  reason: string; // short human explanation of canWrite/conflict
  preferred: boolean;
  peerReachable: boolean;
  token: string | null; // state marker of the local data
  peerToken: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: number; // ms; a stale file means the sync loop stopped, so writes are refused
};

const statusFile = () => `${dbFilePath()}.sync-status.json`;
export const stateFile = () => `${dbFilePath()}.sync-state.json`;

export function writeSyncStatus(status: SyncStatus) {
  const file = statusFile();
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(status));
  renameSync(tmp, file);
}

let cache: { at: number; value: SyncStatus | null } = { at: 0, value: null };

/** Cached for a second so every request does not hit the disk. Null when no sync loop has started yet. */
export function readSyncStatus(): SyncStatus | null {
  const now = Date.now();
  if (now - cache.at < 1000) return cache.value;
  let value: SyncStatus | null = null;
  try {
    value = JSON.parse(readFileSync(statusFile(), "utf8")) as SyncStatus;
  } catch {
    value = null;
  }
  cache = { at: now, value };
  return value;
}

/** A status file this old means the sync loop is not running any more. */
export const statusIsFresh = (status: SyncStatus) => Date.now() - status.updatedAt < syncIntervalMs() * 3 + 15_000;
export const writableNow = (status: SyncStatus | null) => !!status && status.canWrite && statusIsFresh(status);

/** Paths that change data or log someone in. */
const WRITE_PATHS = ["/admin", "/api/admin", "/api/mcp", "/oauth", "/api/contact"];
/** Always answered, so the peer and the proxy health checks can see this instance. */
const OPEN_PATHS = ["/api/health", "/api/sync"];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export type Gate = { status: 503; message: string } | null;

/** Decides whether a request may be handled now. Returns null to let it through. */
export function syncGate(pathname: string): Gate {
  if (!syncConfigured()) return null;
  if (OPEN_PATHS.some((p) => under(pathname, p))) return null;
  const status = readSyncStatus();
  if (!status || !status.ready) return { status: 503, message: "Starting: syncing the latest content. Try again in a moment." };
  if (WRITE_PATHS.some((p) => under(pathname, p)) && !writableNow(status)) {
    return { status: 503, message: `Editing is not available on this host right now (${status.reason}). Use the main host.` };
  }
  return null;
}
