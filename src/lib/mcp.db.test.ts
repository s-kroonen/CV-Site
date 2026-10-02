import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/mcp/route";
import { createApiToken } from "@/lib/api-tokens";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db";

let id = 0;
async function rpc(token: string | null, method: string, params?: unknown, headers: Record<string, string> = {}) {
  const res = await POST(
    new Request("http://x/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    }),
  );
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

async function call(token: string, name: string, args: unknown) {
  const { body } = await rpc(token, "tools/call", { name, arguments: args });
  const text: string | undefined = body.result?.content?.[0]?.text;
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {}
  return { isError: !!body.result?.isError, data, error: body.error as { message: string } | undefined };
}

let read: string, write: string, priv: string;
beforeEach(async () => {
  await resetDb();
  read = (await createApiToken("ro", ["read"], null)).token;
  write = (await createApiToken("rw", ["write"], null)).token;
  priv = (await createApiToken("priv", ["write", "private"], null)).token;
});

describe("authentication", () => {
  it("rejects missing, unknown, expired and revoked tokens, and says where to sign in", async () => {
    const none = await rpc(null, "ping");
    expect(none.status).toBe(401);
    expect(none.headers.get("www-authenticate")).toMatch(/resource_metadata="https:\/\/example\.test\/\.well-known\/oauth-protected-resource"/);
    expect((await rpc("cvmcp_nope", "ping")).status).toBe(401);

    const expired = (await createApiToken("old", ["read"], new Date(Date.now() - 1000))).token;
    expect((await rpc(expired, "ping")).status).toBe(401);

    const revoked = await createApiToken("gone", ["read"], null);
    await prisma.apiToken.update({ where: { id: revoked.row.id }, data: { revokedAt: new Date() } });
    expect((await rpc(revoked.token, "ping")).status).toBe(401);
  });

  it("only accepts the site's own origin and answers GET with 405", async () => {
    expect((await rpc(read, "ping", {}, { Origin: "https://evil.test" })).status).toBe(403);
    expect((await rpc(read, "ping", {}, { Origin: "https://example.test" })).status).toBe(200);
    expect(GET().status).toBe(405);
  });

  it("stores only a hash of the token", async () => {
    const rows = await prisma.apiToken.findMany();
    expect(rows.every((r) => !r.tokenHash.includes("cvmcp_") && r.tokenHash !== read)).toBe(true);
  });
});

describe("protocol and scopes", () => {
  it("negotiates the protocol version and acknowledges notifications", async () => {
    const init = await rpc(read, "initialize", { protocolVersion: "2025-06-18" });
    expect(init.body.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { name: "cv-site" } });
    const note = await POST(
      new Request("http://x", { method: "POST", headers: { Authorization: `Bearer ${read}`, "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }),
    );
    expect(note.status).toBe(202);
    expect((await rpc(read, "no/such/method")).body.error.code).toBe(-32601);
  });

  it("lists only the tools a token may use and refuses the others", async () => {
    const names = async (t: string) => ((await rpc(t, "tools/list")).body.result.tools as { name: string }[]).map((x) => x.name);
    expect(await names(read)).not.toContain("create_item");
    expect(await names(write)).toContain("create_item");
    expect(await names(write)).not.toContain("get_private_contact");
    expect(await names(priv)).toContain("get_private_contact");
    expect((await call(read, "create_item", { entity: "skills", data: { name: "x" } })).error?.message).toMatch(/Unknown tool/);
  });
});

describe("content tools", () => {
  it("create, update, archive, trash and restore, with validation errors reported in-band", async () => {
    const created = await call(write, "create_item", { entity: "skills", data: { name: "MCP", category: "Tools", proficiency: 70 } });
    const item = created.data as { id: string };
    expect(item.id).toBeTruthy();

    const updated = (await call(write, "update_item", { entity: "skills", id: item.id, data: { proficiency: null } })).data as { proficiency: unknown; name: string };
    expect(updated).toMatchObject({ name: "MCP", proficiency: null });

    expect((await call(write, "create_item", { entity: "experience", data: {} })).isError).toBe(true);
    expect((await call(write, "get_item", { entity: "nope" })).data).toMatch(/Invalid arguments/);

    for (const action of ["archive", "trash", "restore", "unarchive"]) {
      expect((await call(write, "set_item_state", { entity: "skills", id: item.id, action })).isError).toBe(false);
    }
    const active = (await call(read, "list_items", { entity: "skills" })).data as { id: string }[];
    expect(active.map((s) => s.id)).toEqual([item.id]);
  });

  it("generates project slugs and links items by id", async () => {
    const p = (await call(write, "create_item", { entity: "projects", data: { title: "Probe Project" } })).data as { id: string; slug: string };
    expect(p.slug).toBe("probe-project");
    const e = (await call(write, "create_item", { entity: "experience", data: { title: "Role", projectIds: [p.id] } })).data as { projectIds: string[] };
    expect(e.projectIds).toEqual([p.id]);
  });

  it("uploads images as resized WebP and rejects non-images", async () => {
    const png = await sharp({ create: { width: 800, height: 400, channels: 3, background: "#3366aa" } }).png().toBuffer();
    const ok = (await call(write, "upload_image", { base64: png.toString("base64") })).data as { src: string; width: number };
    expect(ok.src).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/);
    expect(ok.width).toBe(800);
    expect((await call(write, "upload_image", { base64: Buffer.from("hello").toString("base64") })).data).toMatch(/Unsupported image/);
  });

  it("keeps private contact data behind the private scope", async () => {
    await prisma.privateContact.create({ data: { id: 1, email: "a@b.test", phone: "1" } });
    expect((await call(write, "get_private_contact", {})).error?.message).toMatch(/Unknown tool/);
    expect((await call(priv, "get_private_contact", {})).data).toEqual({ email: "a@b.test", phone: "1" });
  });
});

describe("audit log", () => {
  it("records writes and failures, not plain reads", async () => {
    await call(read, "list_items", { entity: "skills" });
    await call(write, "create_item", { entity: "skills", data: { name: "Logged" } });
    await call(write, "create_item", { entity: "skills", data: {} });
    const rows = await prisma.auditLog.findMany({ orderBy: { at: "asc" } });
    expect(rows.map((r) => [r.actor, r.tool, r.ok])).toEqual([
      ["rw", "create_item", true],
      ["rw", "create_item", false],
    ]);
  });
});
