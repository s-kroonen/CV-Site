import { revokeGrant } from "@/lib/oauth";

// Disconnects an OAuth-connected app: revokes the grant and all its access tokens.
// Auth: /api/admin matcher in src/proxy.ts.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await revokeGrant(id);
  } catch {
    return Response.json({ error: "Connection not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
