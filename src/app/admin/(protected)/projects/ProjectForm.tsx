"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectModel } from "@/generated/prisma/models";
import { asStringArray } from "@/lib/json";
import { Field, FormError, SubmitButton, TagInput, TextArea, readApiError } from "@/components/admin/fields";

export function ProjectForm({ item }: { item?: ProjectModel }) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(item ? asStringArray(item.images) : []);
  const [techStack, setTechStack] = useState<string[]>(item ? asStringArray(item.techStack) : []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    setUploading(false);
    event.target.value = "";

    if (!res.ok) {
      setError("Image upload failed.");
      return;
    }
    const body = await res.json();
    setImages((prev) => [...prev, body.path]);
  }

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
      status: data.get("status"),
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

      <div className="flex flex-col gap-2 text-sm">
        <span className="text-ink-muted">
          Images <span className="text-xs opacity-70">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {images.map((src) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-16 w-16 rounded object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => setImages((prev) => prev.filter((s) => s !== src))}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-paper"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={item?.featured} className="accent-[var(--accent)]" />
        Featured (shown first)
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Status</span>
        <select
          name="status"
          defaultValue={item?.status ?? "active"}
          className="rounded-md border border-line bg-paper px-3 py-2 text-ink"
        >
          <option value="active">Active</option>
          <option value="archived">Archived (hidden from the site)</option>
        </select>
      </label>

      <Field label="Sort index" name="sortIndex" type="number" defaultValue={item?.sortIndex ?? 0} hint="Lower numbers appear first." />
      <FormError message={error} />
      <SubmitButton pending={saving} disabled={uploading} />
    </form>
  );
}
