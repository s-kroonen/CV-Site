import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadTranslationInit } from "@/lib/translations";
import { ProjectForm } from "../ProjectForm";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.project.findUnique({ where: { id }, include: { experiences: { select: { id: true } } } });
  if (!item) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Edit project</h1>
      <ProjectForm item={item} links={{ experienceIds: item.experiences.map((e) => e.id) }} translation={await loadTranslationInit("projects", item.id, item)} />
    </main>
  );
}
