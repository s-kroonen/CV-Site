import { z } from "zod";
import { applyLifecycle, emptyTrash, ENTITIES } from "@/lib/lifecycle";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["archive", "unarchive", "trash", "restore", "purge"]),
    entity: z.enum(ENTITIES),
    id: z.string().min(1),
  }),
  z.object({ action: z.literal("empty-trash"), entity: z.enum(ENTITIES) }),
]);

// Auth: covered by the /api/admin matcher in src/proxy.ts.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  try {
    if (parsed.data.action === "empty-trash") {
      return Response.json({ ok: true, purged: await emptyTrash(parsed.data.entity) });
    }
    await applyLifecycle(parsed.data.entity, parsed.data.id, parsed.data.action);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }
}
