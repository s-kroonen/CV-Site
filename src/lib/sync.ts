import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { dbFilePath } from "@/lib/db-path";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { syncConfigured, syncToken } from "@/lib/site-role";
import { uploadDir } from "@/lib/uploads";

/** Names an upload can have (see /uploads/[filename]); anything else is never listed or served. */
export const UPLOAD_NAME = /^[a-f0-9-]+\.(png|jpg|webp|gif)$/i;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Returns a Response to send when the request is not allowed, or null when it is. */
export function authorizeSync(request: Request): Response | null {
  if (!syncConfigured()) return new Response("Not found", { status: 404 });
  if (!rateLimit(`sync:${getClientIp(request)}`, 120, 60_000)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const given = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  if (!timingSafeEqual(digest(given), digest(syncToken()))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export type LocalState = { revision: number; token: string };

/** The data's state marker (kept up to date by database triggers, see the sync_meta migration). */
export async function readLocalState(): Promise<LocalState> {
  const row = await prisma.syncMeta.findUnique({ where: { id: 1 } });
  if (!row) throw new Error("SyncMeta row is missing - run the database migrations");
  return { revision: row.revision, token: row.token };
}

/**
 * The migration starts the marker at revision 0. A database that already held content then (an existing install)
 * is bumped to revision 1 so it is never mistaken for an empty one.
 */
export async function ensureRevisionSeeded(): Promise<void> {
  const state = await readLocalState();
  if (state.revision !== 0) return;
  const counts = await Promise.all([
    prisma.profile.count(),
    prisma.experience.count(),
    prisma.education.count(),
    prisma.project.count(),
    prisma.skill.count(),
    prisma.adminPasskey.count(),
  ]);
  if (counts.every((n) => n === 0)) return;
  await prisma.syncMeta.update({ where: { id: 1 }, data: { revision: 1, token: randomBytes(8).toString("hex") } });
}

export type Snapshot = { file: string; size: number; sha256: string };

/** Consistent copy of the live database (SQLite online backup, safe while the app is writing). */
export async function createSnapshot(): Promise<Snapshot> {
  const dir = path.join(os.tmpdir(), "cv-site-sync");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `snapshot-${process.pid}-${Date.now()}-${randomBytes(3).toString("hex")}.db`);
  const db = new Database(dbFilePath(), { readonly: true, fileMustExist: true });
  try {
    await db.backup(file);
  } finally {
    db.close();
  }
  return { file, size: (await stat(file)).size, sha256: await sha256File(file) };
}

export function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

export type UploadEntry = { name: string; size: number };

export async function listUploads(): Promise<UploadEntry[]> {
  const dir = uploadDir();
  const names = await readdir(dir).catch(() => [] as string[]);
  const out: UploadEntry[] = [];
  for (const name of names) {
    if (!UPLOAD_NAME.test(name)) continue;
    out.push({ name, size: (await stat(path.join(dir, name))).size });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function removeFile(file: string) {
  await rm(file, { force: true });
}
