import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as healthRoute } from "@/app/api/health/route";
import { GET as writableRoute } from "@/app/api/health/writable/route";
import { GET as stateRoute } from "@/app/api/sync/state/route";
import { GET as uploadsRoute } from "@/app/api/sync/uploads/route";
import { GET as uploadRoute } from "@/app/api/sync/uploads/[name]/route";
import { canRegisterPasskey, issueBootstrapToken } from "@/lib/bootstrap-token";
import { createItem, listItems } from "@/lib/content-service";
import { dbFilePath } from "@/lib/db-path";
import { prisma } from "@/lib/prisma";
import { knownHosts, stateFile, syncGate, writeSyncStatus, type SyncStatus } from "@/lib/site-role";
import { authorizeSync, createSnapshot, ensureRevisionSeeded, readLocalState, removeFile, sha256File, type Snapshot } from "@/lib/sync";
import { applyDatabaseFile, computeWritable, decide, isGatewayError, resetEngineForTests, syncRound } from "@/lib/sync-engine";
import { uploadDir } from "@/lib/uploads";
import { expectedOrigin, rpID } from "@/lib/webauthn";
import { resetDb } from "@/test/db";

const TOKEN = "t".repeat(40);
const env = { ...process.env };
const req = (url: string, token = TOKEN) => new Request(`https://peer.test${url}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(async () => {
  await resetDb();
  resetEngineForTests();
  rmSync(stateFile(), { force: true });
  process.env.SYNC_TOKEN = TOKEN;
  process.env.SYNC_PEER_URL = "https://peer.test";
  process.env.SITE_ROLE = "preferred";
  delete process.env.SYNC_ON_CONFLICT;
});
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
});

const skillNames = async () => (await listItems("skills", "active")).map((s) => (s as { name: string }).name).sort();
const setBase = (baseToken: string | null) => (baseToken === null ? rmSync(stateFile(), { force: true }) : writeFileSync(stateFile(), JSON.stringify({ baseToken })));

/** Puts the live database back to an earlier snapshot (what a host that missed some edits looks like). */
async function rollbackTo(snapshot: Snapshot) {
  const incoming = `${dbFilePath()}.incoming`;
  copyFileSync(snapshot.file, incoming);
  await applyDatabaseFile(incoming, snapshot.sha256);
}

/** Answers the sync endpoints the way the other host would. */
function fakePeer(peer: { token: string; revision: number; preferred: boolean; dbFile?: string; dbSha?: string; uploads?: { name: string; size: number }[] }) {
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/sync/state") return Response.json({ token: peer.token, revision: peer.revision, preferred: peer.preferred, ready: true, canWrite: peer.preferred });
    if (url.pathname === "/api/sync/uploads") return Response.json(peer.uploads ?? []);
    if (url.pathname === "/api/sync/db") return new Response(readFileSync(peer.dbFile!), { headers: { "x-snapshot-sha256": peer.dbSha! } });
    return new Response(Buffer.from("png-bytes"));
  });
}
const peerDown = () =>
  vi.stubGlobal("fetch", async () => {
    throw new TypeError("fetch failed");
  });

describe("state marker", () => {
  it("changes on every insert, update and delete, in every table including the link tables", async () => {
    const a = await readLocalState();
    const skill = (await createItem("skills", { name: "A" })) as { id: string };
    const b = await readLocalState();
    expect(b.revision).toBeGreaterThan(a.revision);
    expect(b.token).not.toBe(a.token);
    await prisma.skill.update({ where: { id: skill.id }, data: { name: "B" } });
    const c = await readLocalState();
    expect(c.token).not.toBe(b.token);
    await prisma.skill.delete({ where: { id: skill.id } });
    expect((await readLocalState()).token).not.toBe(c.token);

    const project = (await createItem("projects", { title: "P" })) as { id: string };
    const exp = (await createItem("experience", { title: "E", company: "C" })) as { id: string };
    const before = await readLocalState();
    await prisma.experience.update({ where: { id: exp.id }, data: { projects: { connect: { id: project.id } } } });
    expect((await readLocalState()).token).not.toBe(before.token);
  });

  it("is covered for every table by triggers, so a table added later cannot be forgotten", async () => {
    const tables = (
      await prisma.$queryRawUnsafe<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('SyncMeta','_prisma_migrations')",
      )
    ).map((t) => t.name);
    const triggers = (await prisma.$queryRawUnsafe<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type='trigger'")).map((t) => t.name);
    for (const table of tables) {
      for (const suffix of ["ai", "au", "ad"]) expect(triggers, `${table} needs trigger ${suffix}`).toContain(`sync_${table}_${suffix}`);
    }
  });

  it("marks a database that already had content (an existing install) as revision 1", async () => {
    await createItem("skills", { name: "Existing" });
    await prisma.syncMeta.update({ where: { id: 1 }, data: { revision: 0 } });
    await ensureRevisionSeeded();
    expect((await readLocalState()).revision).toBe(1);
  });
});

describe("decide", () => {
  const me = { revision: 3, token: "me" };
  it("compares against the last agreed state", () => {
    expect(decide(me, { revision: 3, token: "me" }, "x", true)).toBe("in-sync");
    expect(decide(me, { revision: 5, token: "peer" }, "me", true)).toBe("pull"); // only the peer changed
    expect(decide(me, { revision: 5, token: "peer" }, "peer", true)).toBe("wait"); // only we changed
    expect(decide(me, { revision: 5, token: "peer" }, "old", true)).toBe("conflict"); // both changed
  });
  it("pulls when this host never recorded the agreement but the peer did, with exactly our data", () => {
    expect(decide(me, { revision: 5, token: "peer", base: "me" }, null, true)).toBe("pull");
    expect(decide(me, { revision: 5, token: "peer", base: "other" }, null, true)).toBe("wait");
  });
  it("without a common state: an empty side adopts the other, otherwise the standby adopts the preferred host", () => {
    const peer = { revision: 4, token: "peer" };
    expect(decide({ revision: 0, token: "e" }, peer, null, true)).toBe("pull");
    expect(decide(me, { revision: 0, token: "e" }, null, false)).toBe("wait");
    expect(decide({ revision: 0, token: "a" }, { revision: 0, token: "b" }, null, false)).toBe("pull"); // both empty
    expect(decide({ revision: 0, token: "a" }, { revision: 0, token: "b" }, null, true)).toBe("wait");
    expect(decide(me, peer, null, true)).toBe("wait");
    expect(decide(me, peer, null, false)).toBe("pull");
  });
});

describe("computeWritable", () => {
  const base = { preferred: true, ready: true, conflict: false, peerReachable: true, decision: "in-sync" as const, baseKnown: true };
  it("lets the preferred host write unless it is starting, in conflict or behind the peer", () => {
    expect(computeWritable(base).canWrite).toBe(true);
    expect(computeWritable({ ...base, peerReachable: false, decision: null }).canWrite).toBe(true);
    expect(computeWritable({ ...base, ready: false }).canWrite).toBe(false);
    expect(computeWritable({ ...base, conflict: true }).canWrite).toBe(false);
    expect(computeWritable({ ...base, decision: "pull" }).canWrite).toBe(false);
  });
  it("lets the standby write only when the preferred host cannot be reached and it has synced before", () => {
    const standby = { ...base, preferred: false };
    expect(computeWritable(standby).canWrite).toBe(false);
    expect(computeWritable({ ...standby, peerReachable: false, decision: null }).canWrite).toBe(true);
    expect(computeWritable({ ...standby, peerReachable: false, decision: null, baseKnown: false }).canWrite).toBe(false);
    expect(computeWritable({ ...standby, peerReachable: false, decision: null, conflict: true }).canWrite).toBe(false);
  });
});

describe("sync rounds", () => {
  it("standby: takes over when the preferred host is down, and stands down when it is back", async () => {
    process.env.SITE_ROLE = "standby";
    const mine = await readLocalState();
    setBase(mine.token);
    peerDown();
    let status = await syncRound();
    expect(status).toMatchObject({ ready: true, canWrite: true, peerReachable: false });

    fakePeer({ token: mine.token, revision: mine.revision, preferred: true });
    status = await syncRound();
    expect(status).toMatchObject({ canWrite: false, peerReachable: true, reason: "the main host is up" });
  });

  it("standby: a first start with no earlier sync does not take edits while the preferred host is down", async () => {
    process.env.SITE_ROLE = "standby";
    peerDown();
    expect(await syncRound()).toMatchObject({ ready: true, canWrite: false, reason: "never synced with the main host" });
  });

  it("a peer that answers with an error still counts as up, so the standby does not take over", async () => {
    process.env.SITE_ROLE = "standby";
    setBase((await readLocalState()).token);
    vi.stubGlobal("fetch", async () => new Response("no", { status: 401 }));
    expect(await syncRound()).toMatchObject({ canWrite: false, peerReachable: true });
  });

  it("pulls the other host's edits (and uploads), then may write again", async () => {
    await createItem("skills", { name: "Shared" });
    const agreed = await createSnapshot();
    setBase((await readLocalState()).token);
    await createItem("skills", { name: "Edited on the other host" });
    const peerSnapshot = await createSnapshot();
    const peerState = await readLocalState();
    await rollbackTo(agreed); // this host missed the edit
    expect(await skillNames()).toEqual(["Shared"]);
    rmSync(uploadDir(), { recursive: true, force: true });
    mkdirSync(uploadDir(), { recursive: true });
    writeFileSync(path.join(uploadDir(), "dead-0000.png"), "stale");

    fakePeer({ ...peerState, preferred: false, dbFile: peerSnapshot.file, dbSha: peerSnapshot.sha256, uploads: [{ name: "aaaa-1111.png", size: 9 }] });
    const status = await syncRound();
    expect(status).toMatchObject({ canWrite: true, conflict: false });
    expect(await skillNames()).toEqual(["Edited on the other host", "Shared"]);
    expect(readdirSync(uploadDir())).toEqual(["aaaa-1111.png"]);
    expect(JSON.parse(readFileSync(stateFile(), "utf8")).baseToken).toBe(peerState.token);
    await Promise.all([agreed, peerSnapshot].map((s) => removeFile(s.file)));
  });

  it("a proxy answering 502/503/504 for a stopped host counts as down, so the standby takes over", async () => {
    process.env.SITE_ROLE = "standby";
    setBase((await readLocalState()).token);
    for (const code of [502, 503, 504, 522]) {
      vi.stubGlobal("fetch", async () => new Response("bad gateway", { status: code }));
      expect(await syncRound(), String(code)).toMatchObject({ peerReachable: false, canWrite: true });
    }
    expect([401, 403, 404, 500].some(isGatewayError)).toBe(false);
  });

  it("refuses to write while it is behind the peer and the pull fails", async () => {
    await createItem("skills", { name: "Shared" });
    setBase((await readLocalState()).token);
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/sync/state") return Response.json({ token: "newer", revision: 99, preferred: false, ready: true, canWrite: true });
      return new Response("boom", { status: 500 });
    });
    expect(await syncRound()).toMatchObject({ canWrite: false, reason: "catching up with the other host" });
  });

  it("stops on a conflict and changes nothing; SYNC_ON_CONFLICT=peer keeps a copy and adopts the other data", async () => {
    await createItem("skills", { name: "Shared" });
    const agreed = await createSnapshot();
    setBase((await readLocalState()).token);
    await createItem("skills", { name: "Peer only" });
    const peerSnapshot = await createSnapshot();
    const peerState = await readLocalState();
    await rollbackTo(agreed);
    await createItem("skills", { name: "Local only" }); // both hosts changed after the agreed state
    fakePeer({ ...peerState, preferred: false, dbFile: peerSnapshot.file, dbSha: peerSnapshot.sha256 });

    const halted = await syncRound();
    expect(halted).toMatchObject({ canWrite: false, conflict: true });
    expect(await skillNames()).toEqual(["Local only", "Shared"]);

    process.env.SYNC_ON_CONFLICT = "peer";
    const resolved = await syncRound();
    expect(resolved).toMatchObject({ canWrite: true, conflict: false });
    expect(await skillNames()).toEqual(["Peer only", "Shared"]);
    const kept = readdirSync(path.dirname(dbFilePath())).filter((f) => f.includes(".conflict-"));
    expect(kept).toHaveLength(1);
    rmSync(path.join(path.dirname(dbFilePath()), kept[0]), { force: true });
    await Promise.all([agreed, peerSnapshot].map((s) => removeFile(s.file)));
  });

  it("refuses a database made by a different version of the site (other migrations)", async () => {
    const snapshot = await createSnapshot();
    const db = new Database(snapshot.file);
    db.exec(
      "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES ('x','x',CURRENT_TIMESTAMP,'99999999999999_from_the_future',CURRENT_TIMESTAMP,1)",
    );
    db.close();
    const incoming = `${dbFilePath()}.incoming`;
    copyFileSync(snapshot.file, incoming);
    const sha = await sha256File(incoming);
    await expect(applyDatabaseFile(incoming, sha)).rejects.toThrow(/different version/);
    expect(existsSync(incoming)).toBe(false);
    await removeFile(snapshot.file);
  });

  it("refuses a database that does not match its checksum", async () => {
    const file = path.join(path.dirname(dbFilePath()), "bad.incoming");
    writeFileSync(file, "not a database");
    await expect(applyDatabaseFile(file, "0".repeat(64))).rejects.toThrow(/checksum/);
    expect(existsSync(file)).toBe(false);
  });
});

describe("gate, health and endpoints", () => {
  const status = (over: Partial<SyncStatus>): SyncStatus => ({
    ready: true,
    canWrite: true,
    conflict: false,
    reason: "main host",
    preferred: true,
    peerReachable: true,
    peerCanWrite: false,
    token: "t",
    peerToken: "t",
    lastSyncAt: null,
    lastError: null,
    updatedAt: Date.now(),
    ...over,
  });
  // The status file is cached for a second inside the module, so wait for the cache to expire after each change.
  const setStatus = async (s: SyncStatus) => {
    writeSyncStatus(s);
    await new Promise((r) => setTimeout(r, 1100));
  };

  it("answers 503 until the first sync round has finished, then lets pages through", async () => {
    await setStatus(status({ ready: false, canWrite: false, reason: "starting" }));
    expect(syncGate("/en/projects")).toMatchObject({ status: 503 });
    expect((await healthRoute()).status).toBe(503);
    expect(syncGate("/api/health")).toBeNull();
    expect(syncGate("/api/sync/state")).toBeNull();
    await setStatus(status({}));
    expect(syncGate("/en/projects")).toBeNull();
    expect((await healthRoute()).status).toBe(200);
  });

  it("refuses edits, logins, tokens and messages while this host may not write, but not public reads", async () => {
    await setStatus(status({ canWrite: false, reason: "the main host is up" }));
    for (const p of ["/admin/projects", "/api/admin/projects", "/api/mcp", "/oauth/token", "/api/contact"]) expect(syncGate(p), p).toMatchObject({ status: 503 });
    for (const p of ["/en/projects", "/api/contact-info", "/api/cv.json", "/uploads/x.png"]) expect(syncGate(p), p).toBeNull();
    expect((await writableRoute()).status).toBe(503);
  });

  it("passes an edit on to the peer when the peer is taking edits, but never back and never during a conflict", async () => {
    process.env.SYNC_PEER_URL = "https://amber.test";
    await setStatus(status({ canWrite: false, reason: "the main host is up", preferred: false, peerCanWrite: true }));
    expect(syncGate("/api/admin/projects")).toEqual({ forwardTo: "https://amber.test" });
    expect(syncGate("/admin/projects")).toEqual({ forwardTo: "https://amber.test" });
    expect(syncGate("/api/admin/projects", true)).toMatchObject({ status: 503 }); // already passed on once
    expect(syncGate("/en/projects")).toBeNull(); // public pages are served locally
    await setStatus(status({ canWrite: false, preferred: false, peerCanWrite: false }));
    expect(syncGate("/api/admin/projects")).toMatchObject({ status: 503 });
    await setStatus(status({ canWrite: false, preferred: false, peerCanWrite: true, conflict: true }));
    expect(syncGate("/api/admin/projects")).toMatchObject({ status: 503 });
  });

  it("treats an old status file as 'not writable' (the sync loop stopped)", async () => {
    await setStatus(status({ updatedAt: Date.now() - 10 * 60_000 }));
    expect(syncGate("/api/admin/projects")).toMatchObject({ status: 503 });
  });

  it("does nothing without a peer configured", () => {
    delete process.env.SYNC_PEER_URL;
    expect(syncGate("/api/admin/projects")).toBeNull();
  });

  it("serve the peer only with the shared token", async () => {
    expect((await stateRoute(req("/api/sync/state", ""))).status).toBe(401);
    expect((await stateRoute(req("/api/sync/state", "wrong"))).status).toBe(401);
    const ok = await stateRoute(req("/api/sync/state"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ preferred: true });
    expect((await uploadsRoute(req("/api/sync/uploads"))).status).toBe(200);
    delete process.env.SYNC_PEER_URL;
    expect(authorizeSync(req("/x"))?.status).toBe(404);
  });

  it("serve only well-formed upload names", async () => {
    const params = (name: string) => ({ params: Promise.resolve({ name }) });
    expect((await uploadRoute(req("/x"), params("../secret.db"))).status).toBe(404);
    expect((await uploadRoute(req("/x"), params("missing.png"))).status).toBe(404);
  });
});

describe("known hostnames", () => {
  it("are SITE_URL plus WEBAUTHN_ORIGINS, so a hostname passed on by the peer can be checked", () => {
    process.env.SITE_URL = "https://storm.kroon-en.nl";
    process.env.WEBAUTHN_ORIGINS = "https://storm.amber.kroon-en.nl, http://localhost:3000, not a url";
    expect([...knownHosts()].sort()).toEqual(["localhost:3000", "storm.amber.kroon-en.nl", "storm.kroon-en.nl"]);
    expect(knownHosts().has("evil.example")).toBe(false);
  });
});

describe("passkey hosts", () => {
  it("default to the SITE_URL host and can be widened to a parent domain and several origins", () => {
    delete process.env.WEBAUTHN_RP_ID;
    delete process.env.WEBAUTHN_ORIGINS;
    expect(rpID()).toBe("example.test");
    expect(expectedOrigin()).toBe("https://example.test");
    process.env.WEBAUTHN_RP_ID = "kroon-en.nl";
    process.env.WEBAUTHN_ORIGINS = "https://storm.kroon-en.nl, https://storm.amber.kroon-en.nl/";
    expect(rpID()).toBe("kroon-en.nl");
    expect(expectedOrigin()).toEqual(["https://example.test", "https://storm.kroon-en.nl", "https://storm.amber.kroon-en.nl"]);
  });

  it("setup links only register over an existing passkey when minted for an additional one", () => {
    expect(canRegisterPasskey(issueBootstrapToken(), 0)).toBe(true);
    expect(canRegisterPasskey(issueBootstrapToken(), 1)).toBe(false);
    expect(canRegisterPasskey(issueBootstrapToken(true), 1)).toBe(true);
    expect(canRegisterPasskey("garbage", 0)).toBe(false);
  });
});
