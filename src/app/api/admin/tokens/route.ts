import { z } from "zod";
import { SCOPES, createApiToken } from "@/lib/api-tokens";
import { formatZodError } from "@/lib/admin-schemas";

const schema = z.object({
  name: z.string().trim().min(1, "Give the token a name").max(100),
  scopes: z.array(z.enum(SCOPES)).default(["read"]),
  expiresInDays: z.number().int().min(1).max(3650).nullable().optional(),
});

// Auth: covered by the /api/admin matcher in src/proxy.ts. The plaintext token
// is returned once here and cannot be retrieved again.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });

  const { name, scopes, expiresInDays } = parsed.data;
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null;
  const { token, row } = await createApiToken(name, scopes, expiresAt);
  return Response.json({ token, id: row.id, prefix: row.prefix }, { status: 201 });
}
