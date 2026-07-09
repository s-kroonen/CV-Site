"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SkillModel } from "@/generated/prisma/models";

export function SkillForm({ item }: { item?: SkillModel }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: data.get("name"),
      category: data.get("category"),
      proficiency: Number(data.get("proficiency")),
      sortIndex: Number(data.get("sortIndex") ?? 0),
    };

    const res = await fetch(item ? `/api/admin/skills/${item.id}` : "/api/admin/skills", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      setError("Could not save. Check the fields and try again.");
      return;
    }

    router.push("/admin/skills");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name" name="name" defaultValue={item?.name} required />
      <Field label="Category" name="category" defaultValue={item?.category} required />
      <Field label="Proficiency (0-100)" name="proficiency" type="number" defaultValue={item?.proficiency ?? 50} required />
      <Field label="Sort index" name="sortIndex" type="number" defaultValue={item?.sortIndex ?? 0} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-md bg-current px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="opacity-70">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded-md border border-current/20 bg-transparent px-3 py-2"
      />
    </label>
  );
}
