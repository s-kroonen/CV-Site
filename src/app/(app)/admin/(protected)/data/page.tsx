import { DataTools } from "./DataTools";

export default function AdminDataPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold">Import &amp; export</h1>
      <DataTools />
    </main>
  );
}
