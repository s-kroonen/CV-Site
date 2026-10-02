import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadTranslationInit } from "@/lib/translations";
import { EducationForm } from "../EducationForm";

export default async function EditEducationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.education.findUnique({ where: { id }, include: { experiences: { select: { id: true } } } });
  if (!item) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Edit education</h1>
      <EducationForm item={item} links={{ experienceIds: item.experiences.map((e) => e.id) }} translation={await loadTranslationInit("education", item.id, item)} />
    </main>
  );
}
