import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export default function setup() {
  const dir = path.join(os.tmpdir(), "cv-site-vitest");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.join(dir, "uploads"), { recursive: true });
  const url = `file:${dir.split(path.sep).join("/")}/test.db`;
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  // Best effort: on Windows the SQLite file can still be locked here; the next run starts clean anyway.
  return () => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  };
}
