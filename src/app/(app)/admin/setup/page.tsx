import { SetupForm } from "./SetupForm";

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold">Set up admin passkey</h1>
      <SetupForm token={token ?? null} />
    </main>
  );
}
