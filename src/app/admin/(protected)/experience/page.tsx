import Link from "next/link";
import { getExperience } from "@/lib/data";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminExperiencePage() {
  const items = await getExperience();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Experience</h1>
        <Link href="/admin/experience/new" className="text-sm underline underline-offset-4">
          + Add
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-md border border-current/15 px-4 py-3">
            <span>
              {item.title} · {item.company}
            </span>
            <div className="flex gap-4">
              <Link href={`/admin/experience/${item.id}`} className="text-sm underline underline-offset-4">
                Edit
              </Link>
              <DeleteButton endpoint={`/api/admin/experience/${item.id}`} confirmText={`Delete "${item.title}"?`} />
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="opacity-60">No entries yet.</p>}
      </ul>
    </main>
  );
}
