"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectModel } from "@/generated/prisma/models";
import { asImages, asStringArray } from "@/lib/json";
import { ImageField, type ImageValue } from "@/components/admin/ImageField";
import { Field, FormError, SubmitButton, TagInput, TextArea, readApiError } from "@/components/admin/fields";

export function ProjectForm({ item }: { item?: ProjectModel }) {
  const router = useRouter();
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <FormError message={error} />
      <SubmitButton pending={saving} />
    </form>
  );
}
