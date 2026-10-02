"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceModel } from "@/generated/prisma/models";
import { asStringArray } from "@/lib/json";
import { ImageField, type ImageValue } from "@/components/admin/ImageField";
import { TranslationPanel, readFormFields, useTranslation, type TranslationInit } from "@/components/admin/TranslationPanel";
import type { Locale } from "@/lib/i18n/config";
import { Field, FormError, SubmitButton, TagInput, TextArea, readApiError } from "@/components/admin/fields";

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function ExperienceForm({ item, translation }: { item?: ExperienceModel; translation?: TranslationInit }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const tr = useTranslation("experience", (item?.sourceLang as Locale) ?? "en", translation ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState<ImageValue[]>(item?.logoPath ? [{ src: item.logoPath, alt: "" }] : []);
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
      ...tr.payload(),
      logoPath: logo[0]?.thumb ?? logo[0]?.src ?? null,
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">Fill in a job title or a company - everything else is optional.</p>
      <Field label="Job title" name="title" defaultValue={item?.title} />
      <Field label="Company" name="company" defaultValue={item?.company} />
      <ImageField label="Logo" value={logo} onChange={setLogo} withAlt={false} hint="Company or school logo shown next to the entry." />
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
      <TranslationPanel tr={tr} getSource={() => readFormFields(formRef.current, ["title", "location", "description", "bullets"])} />
      <FormError message={error} />
      <SubmitButton pending={saving} />
    </form>
  );
}
