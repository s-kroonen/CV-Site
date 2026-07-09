import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.read !== "boolean") {
    return Response.json({ error: "Expected { read: boolean }" }, { status: 400 });
  }

  const updated = await prisma.contactMessage.update({ where: { id }, data: { read: body.read } });
  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.contactMessage.delete({ where: { id } });
  return Response.json({ ok: true });
}
