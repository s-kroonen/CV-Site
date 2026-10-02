"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceModel } from "@/generated/prisma/models";
import { asStringArray } from "@/lib/json";
import { Field, FormError, SubmitButton, TagInput, TextArea, readApiError } from "@/components/admin/fields";

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function ExperienceForm({ item }: { item?: ExperienceModel }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<string[]>(item ? asStringArray(item.tags) : []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const bullets = String(data.get("bullets") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      company: data.get("company"),
      title: data.get("title"),
      location: data.get("location") || null,
      startDate: data.get("startDate") || null,
      endDate: data.get("endDate") || null,
      description: data.get("description"),
      bullets,
      tags,
      sortIndex: Number(data.get("sortIndex") ?? 0),
    };

    const res = await fetch(item ? `/api/admin/experience/${item.id}` : "/api/admin/experience", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      setError(await readApiError(res));
      return;
    }

    router.push("/admin/experience");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">Fill in a job title or a company - everything else is optional.</p>
      <Field label="Job title" name="title" defaultValue={item?.title} />
      <Field label="Company" name="company" defaultValue={item?.company} />
      <Field label="Location" name="location" defaultValue={item?.location ?? ""} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" name="startDate" type="date" defaultValue={toDateInput(item?.startDate)} />
        <Field
          label="End date"
          name="endDate"
          type="date"
          defaultValue={toDateInput(item?.endDate)}
          hint="Leave blank if this is your current role."
        />
      </div>
      <TextArea label="Description" name="description" defaultValue={item?.description} />
      <TextArea
        label="Bullet points"
        name="bullets"
        defaultValue={item ? asStringArray(item.bullets).join("\n") : ""}
        hint="One per line."
      />
      <TagInput label="Tags" value={tags} onChange={setTags} hint="Technologies, skills or keywords. Pick an existing one to avoid typos." />
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
