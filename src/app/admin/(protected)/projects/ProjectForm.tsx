"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectModel } from "@/generated/prisma/models";

export function ProjectForm({ item }: { item?: ProjectModel }) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(item ? (item.images as string[]) : []);
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
    const techStack = String(data.get("techStack") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: data.get("title"),
      slug: data.get("slug"),
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
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not save. Check the fields and try again.");
      return;
    }

    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title" name="title" defaultValue={item?.title} required />
      <Field label="Slug" name="slug" defaultValue={item?.slug} required />
      <Field label="Summary" name="summary" defaultValue={item?.summary} required />
      <TextArea label="Description" name="description" defaultValue={item?.description} required />
      <Field
        label="Tech stack (comma-separated)"
        name="techStack"
        defaultValue={item ? (item.techStack as string[]).join(", ") : ""}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Repository URL" name="repoUrl" defaultValue={item?.repoUrl ?? ""} />
        <Field label="Live URL" name="liveUrl" defaultValue={item?.liveUrl ?? ""} />
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <span className="opacity-70">Images</span>
        <div className="flex flex-wrap gap-2">
          {images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-16 w-16 rounded object-cover" />
          ))}
        </div>
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={item?.featured} />
        Featured
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="opacity-70">Status</span>
        <select
          name="status"
          defaultValue={item?.status ?? "active"}
          className="rounded-md border border-current/20 bg-transparent px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <Field label="Sort index" name="sortIndex" type="number" defaultValue={item?.sortIndex ?? 0} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving || uploading}
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

function TextArea({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="opacity-70">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        rows={4}
        className="rounded-md border border-current/20 bg-transparent px-3 py-2"
      />
    </label>
  );
}
