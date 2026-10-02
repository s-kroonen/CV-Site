import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadTranslationInit } from "@/lib/translations";
import { ExperienceForm } from "../ExperienceForm";

export default async function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.experience.findUnique({ where: { id }, include: { projects: { select: { id: true } }, education: { select: { id: true } } } });
  if (!item) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Edit experience</h1>
      <ExperienceForm item={item} links={{ projectIds: item.projects.map((p) => p.id), educationIds: item.education.map((e) => e.id) }} translation={await loadTranslationInit("experience", item.id, item)} />
    </main>
  );
}
