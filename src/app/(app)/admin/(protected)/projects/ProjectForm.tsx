"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectModel } from "@/generated/prisma/models";
import { asImages, asStringArray } from "@/lib/json";
import { ImageField, type ImageValue } from "@/components/admin/ImageField";
import { RelationPicker } from "@/components/admin/RelationPicker";
import { TranslationPanel, readFormFields, useTranslation, type TranslationInit } from "@/components/admin/TranslationPanel";
import type { Locale } from "@/lib/i18n/config";
import { Field, FormError, SubmitButton, TagInput, TextArea, readApiError } from "@/components/admin/fields";

export function ProjectForm({ item, translation, links }: { links?: { experienceIds: string[] }; item?: ProjectModel; translation?: TranslationInit }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [experienceIds, setExperienceIds] = useState<string[]>(links?.experienceIds ?? []);
  const tr = useTranslation("projects", (item?.sourceLang as Locale) ?? "en", translation ?? null);
  const [images, setImages] = useState<ImageValue[]>(item ? asImages(item.images) : []);
  const [techStack, setTechStack] = useState<string[]>(item ? asStringArray(item.techStack) : []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      ...tr.payload(),
      experienceIds,
      title: data.get("title"),
      slug: data.get("slug") || "",
      summary: data.get("summary"),
      description: data.get("description"),
      techStack,
      repoUrl: data.get("repoUrl") || "",
      liveUrl: data.get("liveUrl") || "",
      images,
      featured: data.get("featured") === "on",
      sortIndex: Number(data.get("sortIndex") ?? 0),
    };

    const res = await fetch(item ? `/api/admin/projects/${item.id}` : "/api/admin/projects", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      setError(await readApiError(res));
      return;
    }

    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title" name="title" defaultValue={item?.title} required />
      <Field
        label="URL slug"
        name="slug"
        defaultValue={item?.slug}
        hint="Used in the project's web address. Leave blank to generate it from the title."
      />
      <Field label="Summary" name="summary" defaultValue={item?.summary} hint="One line shown on the project card." />
      <TextArea label="Description" name="description" defaultValue={item?.description} rows={6} />
      <TagInput
        label="Tech stack"
        value={techStack}
        onChange={setTechStack}
        hint="Pick an existing tag to avoid spelling variations, or add a new one."
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Repository URL" name="repoUrl" type="url" defaultValue={item?.repoUrl ?? ""} placeholder="https://" />
        <Field label="Live URL" name="liveUrl" type="url" defaultValue={item?.liveUrl ?? ""} placeholder="https://" />
      </div>

      <ImageField
        label="Images"
        value={images}
        onChange={setImages}
        multiple
        hint="The first image is the card cover. Uploads are resized and converted to WebP."
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={item?.featured} className="accent-[var(--accent)]" />
        Featured (shown first)
      </label>

      <Field label="Sort index" name="sortIndex" type="number" defaultValue={item?.sortIndex ?? 0} hint="Lower numbers appear first." />
      <RelationPicker
        label="Linked experience"
        entity="experience"
        value={experienceIds}
        onChange={setExperienceIds}
        hint="The role(s) this project was done in. The project shows up on that experience's page."
      />
      <TranslationPanel tr={tr} getSource={() => readFormFields(formRef.current, ["summary", "description"])} />
      <FormError message={error} />
      <SubmitButton pending={saving} />
    </form>
  );
}
