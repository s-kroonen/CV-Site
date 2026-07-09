import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EducationForm } from "../EducationForm";

export default async function EditEducationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.education.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Edit education</h1>
      <EducationForm item={item} />
    </main>
  );
}
