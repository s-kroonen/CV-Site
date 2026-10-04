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
  peerCanWrite: boolean; // the peer says it is taking edits (so a refused edit can be passed on to it)
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

export type Gate = { status: 503; message: string } | { forwardTo: string } | null;

/** Hostnames this site is served under (SITE_URL plus WEBAUTHN_ORIGINS); used to trust a hostname passed on by the peer. */
export function knownHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const raw of [process.env.SITE_URL ?? "", ...(process.env.WEBAUTHN_ORIGINS ?? "").split(",")]) {
    try {
      if (raw.trim()) hosts.add(new URL(raw.trim()).host);
    } catch {
      // ignore malformed entries
    }
  }
  return hosts;
}

export const FORWARDED_HOST_HEADER = "x-cv-forwarded-host";
export const FORWARDED_PROTO_HEADER = "x-cv-forwarded-proto";

/** Set on a request this host passes to its peer, so the peer never passes it back. */
export const FORWARDED_HEADER = "x-cv-forwarded";

/**
 * Decides whether a request may be handled now. Returns null to let it through, a 503 to refuse it, or
 * `forwardTo` (the peer's URL) when this host may not take the edit but the peer is taking edits: the request is then
 * passed on to the peer, so a proxy that sends edits to the wrong host (e.g. a weighted setup) still works.
 */
export function syncGate(pathname: string, forwarded = false): Gate {
  if (!syncConfigured()) return null;
  if (OPEN_PATHS.some((p) => under(pathname, p))) return null;
  const status = readSyncStatus();
  if (!status || !status.ready) return { status: 503, message: "Starting: syncing the latest content. Try again in a moment." };
  if (WRITE_PATHS.some((p) => under(pathname, p)) && !writableNow(status)) {
    if (!forwarded && !status.conflict && status.peerReachable && status.peerCanWrite && statusIsFresh(status)) {
      return { forwardTo: peerUrl() };
    }
    return { status: 503, message: `Editing is not available on this host right now (${status.reason}). Use the main host.` };
  }
  return null;
}
