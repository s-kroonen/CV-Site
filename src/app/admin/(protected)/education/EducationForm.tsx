"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EducationModel } from "@/generated/prisma/models";

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function EducationForm({ item }: { item?: EducationModel }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      institution: data.get("institution"),
      degree: data.get("degree"),
      field: data.get("field") || null,
      startDate: data.get("startDate"),
      endDate: data.get("endDate") || null,
      description: data.get("description") || null,
      sortIndex: Number(data.get("sortIndex") ?? 0),
    };

    const res = await fetch(item ? `/api/admin/education/${item.id}` : "/api/admin/education", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      setError("Could not save. Check the fields and try again.");
      return;
    }

    router.push("/admin/education");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Institution" name="institution" defaultValue={item?.institution} required />
      <Field label="Degree" name="degree" defaultValue={item?.degree} required />
      <Field label="Field of study" name="field" defaultValue={item?.field ?? ""} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" name="startDate" type="date" defaultValue={toDateInput(item?.startDate)} required />
        <Field label="End date" name="endDate" type="date" defaultValue={toDateInput(item?.endDate)} />
      </div>
      <TextArea label="Description" name="description" defaultValue={item?.description ?? ""} />
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

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="opacity-70">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={4}
        className="rounded-md border border-current/20 bg-transparent px-3 py-2"
      />
    </label>
  );
}
