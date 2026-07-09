import { EducationForm } from "../EducationForm";

export default function NewEducationPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Add education</h1>
      <EducationForm />
    </main>
  );
}
