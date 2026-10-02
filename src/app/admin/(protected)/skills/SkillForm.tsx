"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SkillModel } from "@/generated/prisma/models";
import { Field, FormError, SubmitButton, TagInput, readApiError } from "@/components/admin/fields";

export function SkillForm({ item }: { item?: SkillModel }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string[]>(item?.category ? [item.category] : []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const proficiency = String(data.get("proficiency") ?? "").trim();
    const payload = {
      name: data.get("name"),
      category: category[0] ?? "",
      proficiency: proficiency === "" ? null : Number(proficiency),
      sortIndex: Number(data.get("sortIndex") ?? 0),
    };

    const res = await fetch(item ? `/api/admin/skills/${item.id}` : "/api/admin/skills", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      setError(await readApiError(res));
      return;
    }

    router.push("/admin/skills");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name" name="name" defaultValue={item?.name} required />
      <TagInput
        label="Category"
        value={category}
        onChange={setCategory}
        pool="categories"
        single
        placeholder="e.g. Languages - type to search or add…"
        hint="Skills with the same category are grouped together. Blank = grouped under Other."
      />
      <Field
        label="Proficiency (0-100)"
        name="proficiency"
        type="number"
        defaultValue={item?.proficiency}
        hint="Leave blank to show the skill without a level bar."
      />
      <Field
        label="Sort index"
        name="sortIndex"
        type="number"
        defaultValue={item?.sortIndex ?? 0}
        hint="Lower numbers appear first."
      />
      <FormError message={error} />
      <SubmitButton pending={saving} />
    </form>
  );
}
