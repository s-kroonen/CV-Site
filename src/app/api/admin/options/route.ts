import { prisma } from "@/lib/prisma";

// Selectable items for the admin "linked ..." pickers. Auth: /api/admin matcher in src/proxy.ts.
// GET /api/admin/options?entity=projects|experience|education
export async function GET(request: Request) {
  const entity = new URL(request.url).searchParams.get("entity");
  // Trashed items can't be linked; archived ones still can (they just stay hidden publicly).
  const where = { deletedAt: null };

  if (entity === "projects") {
    const rows = await prisma.project.findMany({ where, orderBy: { title: "asc" }, select: { id: true, title: true, archivedAt: true } });
    return Response.json({ items: rows.map((r) => ({ id: r.id, label: r.title || "(untitled)", archived: !!r.archivedAt })) });
  }
  if (entity === "experience") {
    const rows = await prisma.experience.findMany({ where, orderBy: { sortIndex: "asc" }, select: { id: true, title: true, company: true, archivedAt: true } });
    return Response.json({
      items: rows.map((r) => ({ id: r.id, label: [r.title, r.company].filter(Boolean).join(" · ") || "(untitled)", archived: !!r.archivedAt })),
    });
  }
  if (entity === "education") {
    const rows = await prisma.education.findMany({ where, orderBy: { sortIndex: "asc" }, select: { id: true, degree: true, institution: true, archivedAt: true } });
    return Response.json({
      items: rows.map((r) => ({ id: r.id, label: [r.degree, r.institution].filter(Boolean).join(" · ") || "(untitled)", archived: !!r.archivedAt })),
    });
  }
  return Response.json({ error: "Unknown entity." }, { status: 400 });
}
