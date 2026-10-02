import { ExperienceForm } from "../ExperienceForm";

export default function NewExperiencePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Add experience</h1>
      <ExperienceForm />
    </main>
  );
}
