import Link from "next/link";
import { getEducation } from "@/lib/data";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminEducationPage() {
  const items = await getEducation();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Education</h1>
        <Link href="/admin/education/new" className="text-sm underline underline-offset-4">
          + Add
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-md border border-current/15 px-4 py-3">
            <span>
              {item.degree} · {item.institution}
            </span>
            <div className="flex gap-4">
              <Link href={`/admin/education/${item.id}`} className="text-sm underline underline-offset-4">
                Edit
              </Link>
              <DeleteButton endpoint={`/api/admin/education/${item.id}`} confirmText={`Delete "${item.degree}"?`} />
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="opacity-60">No entries yet.</p>}
      </ul>
    </main>
  );
}
