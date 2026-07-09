import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SkillForm } from "../SkillForm";

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.skill.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Edit skill</h1>
      <SkillForm item={item} />
    </main>
  );
}
