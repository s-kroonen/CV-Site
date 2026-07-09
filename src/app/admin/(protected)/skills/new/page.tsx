import { SkillForm } from "../SkillForm";

export default function NewSkillPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Add skill</h1>
      <SkillForm />
    </main>
  );
}
