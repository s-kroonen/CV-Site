import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/json";
import { ENTITIES, parseView, type Entity } from "@/lib/lifecycle";
import {
  ContentError,
  createItem,
  getItem,
  getPrivateContact,
  getProfileRow,
  listItems,
  setLifecycle,
  updateItem,
  updatePrivateContact,
  updateProfile,
} from "@/lib/content-service";
import { MAX_UPLOAD_BYTES, processImage, sniffImageType, uploadDir } from "@/lib/uploads";
import type { AuthedToken, Scope } from "@/lib/api-tokens";

// A small, stateless MCP server (Streamable HTTP, JSON responses) exposing the
// site's content to AI tools. Hand-rolled instead of pulling in the full SDK
// (and its express/hono dependency tree) - the surface we need is just
// initialize, ping, tools/list and tools/call.

export const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "cv-site", version: "1.0.0" };

const INSTRUCTIONS = `Manage the content of Storm Kroonen's CV site. Entities: experience, education, projects, skills (plus the profile).
Call describe_entity first to see the fields of an entity. Dates are YYYY-MM-DD. Most fields are optional; one identifying field is required (title/company, institution/degree, project title, skill name).
Tags (experience.tags, projects.techStack) and skill categories should reuse existing spellings: call list_tags before adding new ones.
"Delete" moves an item to the trash (restorable); archiving hides an item from the public site without deleting it. Permanent deletion is only possible in the admin UI.`;

type Ctx = { token: AuthedToken };
type Tool = {
  name: string;
  description: string;
  scope: Scope[]; // all of these scopes are required
  inputSchema: Record<string, unknown>;
  run: (args: unknown, ctx: Ctx) => Promise<{ result: unknown; entity?: string; entityId?: string }>;
};

const entityEnum = { type: "string", enum: [...ENTITIES], description: "Which kind of item." };
const idProp = { type: "string", description: "Item id (from list_items)." };
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const FIELD_DOCS: Record<Entity, string> = {
  experience:
    "title (string), company (string) - at least one required; location; startDate and endDate (YYYY-MM-DD, endDate null/empty = current role); description; bullets (string[]); tags (string[]); logoPath (from upload_image); sortIndex (number, lower first).",
  education:
    "institution (string), degree (string) - at least one required; field (field of study); startDate, endDate (YYYY-MM-DD); description; logoPath; sortIndex.",
  projects:
    "title (required); slug (optional, generated from title); summary (one line); description; techStack (string[]); repoUrl; liveUrl; images (array of {src, alt, thumb?, width?, height?} - use upload_image results); featured (boolean); sortIndex.",
  skills:
    "name (required); category (string, e.g. 'Languages'); proficiency (0-100 or null for no level bar); sortIndex.",
};

const entityArg = z.object({ entity: z.enum(ENTITIES) });
const dataObj = z.record(z.string(), z.unknown());

const tools: Tool[] = [
  {
    name: "describe_entity",
    description: "Describe the fields of an entity type (experience, education, projects, skills).",
    scope: ["read"],
    inputSchema: obj({ entity: entityEnum }, ["entity"]),
    run: async (args) => {
      const { entity } = entityArg.parse(args);
      return { result: { entity, fields: FIELD_DOCS[entity] }, entity };
    },
  },
  {
    name: "list_items",
    description: "List items of an entity. view: active (shown on the site, default), archived, or trash.",
    scope: ["read"],
    inputSchema: obj(
      { entity: entityEnum, view: { type: "string", enum: ["active", "archived", "trash"], default: "active" } },
      ["entity"],
    ),
    run: async (args) => {
      const { entity, view } = entityArg.extend({ view: z.string().optional() }).parse(args);
      return { result: await listItems(entity, parseView(view)), entity };
    },
  },
  {
    name: "get_item",
    description: "Get one item by id.",
    scope: ["read"],
    inputSchema: obj({ entity: entityEnum, id: idProp }, ["entity", "id"]),
    run: async (args) => {
      const { entity, id } = entityArg.extend({ id: z.string() }).parse(args);
      return { result: await getItem(entity, id), entity, entityId: id };
    },
  },
  {
    name: "create_item",
    description: "Create an item. `data` holds the fields (see describe_entity). Returns the created item including its id.",
    scope: ["write"],
    inputSchema: obj({ entity: entityEnum, data: { type: "object", description: "Field values." } }, ["entity", "data"]),
    run: async (args) => {
      const { entity, data } = entityArg.extend({ data: dataObj }).parse(args);
      const created = await createItem(entity, data);
      return { result: created, entity, entityId: String(created.id) };
    },
  },
  {
    name: "update_item",
    description: "Update an item. Only the fields in `data` change; everything else is kept.",
    scope: ["write"],
    inputSchema: obj(
      { entity: entityEnum, id: idProp, data: { type: "object", description: "Fields to change." } },
      ["entity", "id", "data"],
    ),
    run: async (args) => {
      const { entity, id, data } = entityArg.extend({ id: z.string(), data: dataObj }).parse(args);
      return { result: await updateItem(entity, id, data), entity, entityId: id };
    },
  },
  {
    name: "set_item_state",
    description:
      "Change an item's lifecycle: archive (hide from site, keep), unarchive, trash (delete, restorable) or restore (out of the trash).",
    scope: ["write"],
    inputSchema: obj(
      { entity: entityEnum, id: idProp, action: { type: "string", enum: ["archive", "unarchive", "trash", "restore"] } },
      ["entity", "id", "action"],
    ),
    run: async (args) => {
      const { entity, id, action } = entityArg
        .extend({ id: z.string(), action: z.enum(["archive", "unarchive", "trash", "restore"]) })
        .parse(args);
      return { result: await setLifecycle(entity, id, action), entity, entityId: id };
    },
  },
  {
    name: "get_profile",
    description: "Get the public profile (name, tagline, bio, public email, location, social links).",
    scope: ["read"],
    inputSchema: obj({}),
    run: async () => ({ result: await getProfileRow() }),
  },
  {
    name: "update_profile",
    description: "Update the public profile. Only the fields in `data` change.",
    scope: ["write"],
    inputSchema: obj({ data: { type: "object", description: "name, tagline, bio, publicEmail, location, socialLinks [{label,url}], avatarPath." } }, ["data"]),
    run: async (args) => ({ result: await updateProfile(z.object({ data: dataObj }).parse(args).data) }),
  },
  {
    name: "get_private_contact",
    description: "Read the private email and phone (hidden from the public site behind a human check).",
    scope: ["read", "private"],
    inputSchema: obj({}),
    run: async () => ({ result: await getPrivateContact() }),
  },
  {
    name: "update_private_contact",
    description: "Update the private email and/or phone.",
    scope: ["write", "private"],
    inputSchema: obj({ data: { type: "object", description: "email, phone." } }, ["data"]),
    run: async (args) => ({ result: await updatePrivateContact(z.object({ data: dataObj }).parse(args).data) }),
  },
  {
    name: "list_tags",
    description:
      "List tags/categories already in use (most used first). pool 'tags' = experience tags + project tech stack; 'categories' = skill categories. Reuse these spellings.",
    scope: ["read"],
    inputSchema: obj({ pool: { type: "string", enum: ["tags", "categories"], default: "tags" } }),
    run: async (args) => {
      const { pool } = z.object({ pool: z.enum(["tags", "categories"]).default("tags") }).parse(args ?? {});
      const counts = new Map<string, { label: string; n: number }>();
      const add = (raw: string) => {
        const label = raw.trim().replace(/\s+/g, " ");
        if (!label) return;
        const e = counts.get(label.toLowerCase());
        if (e) e.n++;
        else counts.set(label.toLowerCase(), { label, n: 1 });
      };
      if (pool === "categories") {
        (await prisma.skill.findMany({ where: { deletedAt: null }, select: { category: true } })).forEach((s) => add(s.category));
      } else {
        (await prisma.experience.findMany({ where: { deletedAt: null }, select: { tags: true } })).forEach((e) =>
          asStringArray(e.tags).forEach(add),
        );
        (await prisma.project.findMany({ where: { deletedAt: null }, select: { techStack: true } })).forEach((p) =>
          asStringArray(p.techStack).forEach(add),
        );
      }
      const items = [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
      return { result: items.map((i) => i.label) };
    },
  },
  {
    name: "upload_image",
    description:
      "Upload an image (PNG, JPEG, WebP or GIF, max 5MB, base64-encoded). It is resized and converted to WebP. Returns {src, thumb, width, height}: use src/thumb in a project's `images` (with alt text) or src as an experience/education `logoPath` or the profile `avatarPath`.",
    scope: ["write"],
    inputSchema: obj({ base64: { type: "string", description: "Base64 image data (no data: prefix)." } }, ["base64"]),
    run: async (args) => {
      const { base64 } = z.object({ base64: z.string().min(1) }).parse(args);
      const buffer = Buffer.from(base64.replace(/^data:[^,]*,/, ""), "base64");
      if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) throw new ContentError("Image is empty or exceeds 5MB.");
      if (!sniffImageType(buffer)) throw new ContentError("Unsupported image format (use PNG, JPEG, WebP or GIF).");
      let processed;
      try {
        processed = await processImage(buffer);
      } catch {
        throw new ContentError("That image could not be read.");
      }
      const dir = uploadDir();
      await mkdir(dir, { recursive: true });
      const id = randomUUID();
      await Promise.all([
        writeFile(path.join(dir, `${id}.webp`), processed.full),
        writeFile(path.join(dir, `${id}-thumb.webp`), processed.thumb),
      ]);
      return {
        result: { src: `/uploads/${id}.webp`, thumb: `/uploads/${id}-thumb.webp`, width: processed.width, height: processed.height },
      };
    },
  },
];

const allowed = (tool: Tool, token: AuthedToken) => tool.scope.every((s) => token.scopes.includes(s));

// ------------------------------------------------------------ JSON-RPC

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const ok = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: RpcRequest["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

async function audit(token: AuthedToken, tool: string, entity: string | undefined, entityId: string | undefined, success: boolean, detail?: string) {
  await prisma.auditLog
    .create({
      data: { actor: token.name, tokenId: token.id, tool, entity: entity ?? null, entityId: entityId ?? null, ok: success, detail: detail?.slice(0, 500) ?? null },
    })
    .catch(() => {});
}

/** Handles one JSON-RPC message. Returns null for notifications (no response body). */
export async function handleRpc(message: RpcRequest, token: AuthedToken): Promise<unknown | null> {
  const { id, method, params } = message;
  if (message.jsonrpc !== "2.0" || typeof method !== "string") return fail(id, -32600, "Invalid request");
  if (id === undefined) return null; // notification (e.g. notifications/initialized)

  switch (method) {
    case "initialize": {
      const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : "";
      return ok(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, {
        tools: tools
          .filter((t) => allowed(t, token))
          .map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      });
    case "tools/call": {
      const name = params?.name;
      const tool = tools.find((t) => t.name === name);
      if (!tool || !allowed(tool, token)) return fail(id, -32602, `Unknown tool: ${String(name)}`);
      // Plain reads are not logged; anything that writes or touches private contact data is.
      const logIt = !(tool.scope.length === 1 && tool.scope[0] === "read");
      try {
        const out = await tool.run(params?.arguments ?? {}, { token });
        if (logIt) await audit(token, tool.name, out.entity, out.entityId, true);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(out.result, null, 2) }] });
      } catch (err) {
        const message =
          err instanceof ContentError
            ? err.message
            : err instanceof z.ZodError
              ? `Invalid arguments: ${err.issues.map((i) => `${i.path.join(".") || "arguments"} ${i.message}`).join("; ")}`
              : "Internal error while running the tool.";
        if (!(err instanceof ContentError) && !(err instanceof z.ZodError)) console.error("MCP tool error", tool.name, err);
        await audit(token, tool.name, undefined, undefined, false, message);
        // Tool failures are reported in-band so the model can read and correct them.
        return ok(id, { content: [{ type: "text", text: message }], isError: true });
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}
