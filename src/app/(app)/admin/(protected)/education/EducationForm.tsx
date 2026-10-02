"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EducationModel } from "@/generated/prisma/models";
import { ImageField, type ImageValue } from "@/components/admin/ImageField";
import { RelationPicker } from "@/components/admin/RelationPicker";
import { TranslationPanel, readFormFields, useTranslation, type TranslationInit } from "@/components/admin/TranslationPanel";
import type { Locale } from "@/lib/i18n/config";
import { Field, FormError, SubmitButton, TextArea, readApiError } from "@/components/admin/fields";

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function EducationForm({ item, translation, links }: { links?: { experienceIds: string[] }; item?: EducationModel; translation?: TranslationInit }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [experienceIds, setExperienceIds] = useState<string[]>(links?.experienceIds ?? []);
  const tr = useTranslation("education", (item?.sourceLang as Locale) ?? "en", translation ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState<ImageValue[]>(item?.logoPath ? [{ src: item.logoPath, alt: "" }] : []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      ...tr.payload(),
      experienceIds,
      logoPath: logo[0]?.thumb ?? logo[0]?.src ?? null,
      institution: data.get("institution"),
      degree: data.get("degree"),
      field: data.get("field") || null,
      startDate: data.get("startDate") || null,
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
      setError(await readApiError(res));
      return;
    }

    router.push("/admin/education");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">Fill in an institution or a degree - everything else is optional.</p>
      <Field label="Institution" name="institution" defaultValue={item?.institution} />
      <Field label="Degree" name="degree" defaultValue={item?.degree} />
      <ImageField label="Logo" value={logo} onChange={setLogo} withAlt={false} hint="Company or school logo shown next to the entry." />
      <Field label="Field of study" name="field" defaultValue={item?.field ?? ""} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" name="startDate" type="date" defaultValue={toDateInput(item?.startDate)} />
        <Field
          label="End date"
          name="endDate"
          type="date"
          defaultValue={toDateInput(item?.endDate)}
          hint="Leave blank if ongoing."
        />
      </div>
      <TextArea label="Description" name="description" defaultValue={item?.description ?? ""} />
      <Field
        label="Sort index"
        name="sortIndex"
        type="number"
        defaultValue={item?.sortIndex ?? 0}
        hint="Lower numbers appear first."
      />
      <RelationPicker
        label="Linked experience"
        entity="experience"
        value={experienceIds}
        onChange={setExperienceIds}
        hint="Internships or jobs that belong to this education. Their projects show up here too (education has no projects of its own)."
      />
      <TranslationPanel tr={tr} getSource={() => readFormFields(formRef.current, ["degree", "field", "description"])} />
      <FormError message={error} />
      <SubmitButton pending={saving} />
    </form>
  );
}
