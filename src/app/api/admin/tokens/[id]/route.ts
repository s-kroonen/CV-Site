import { prisma } from "@/lib/prisma";

// Revokes (does not delete) so the audit log keeps meaning. Auth: /api/admin matcher.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
  } catch {
    return Response.json({ error: "Token not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
