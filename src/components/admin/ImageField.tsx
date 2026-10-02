"use client";

import { useState } from "react";
import { FormError, inputClass, readApiError } from "@/components/admin/fields";

export type ImageValue = { src: string; alt: string; thumb?: string; width?: number; height?: number };

/**
 * Image picker/uploader. Uploads go through /api/admin/upload (re-encoded to
 * WebP, metadata stripped). `multiple` allows a reorderable gallery with alt
 * text per image; otherwise it holds at most one image (logo, avatar).
 */
export function ImageField({
  label,
  value,
  onChange,
  multiple = false,
  hint,
  withAlt = true,
}: {
  label: string;
  value: ImageValue[];
  onChange: (next: ImageValue[]) => void;
  multiple?: boolean;
  hint?: string;
  withAlt?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    const added: ImageValue[] = [];
    for (const file of multiple ? files : files.slice(0, 1)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (!res.ok) {
        setError(`${file.name}: ${await readApiError(res, "Upload failed.")}`);
        continue;
      }
      const body = await res.json();
      added.push({ src: body.src, thumb: body.thumb, width: body.width, height: body.height, alt: "" });
    }
    setUploading(false);
    if (added.length) onChange(multiple ? [...value, ...added] : [added[0]]);
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="text-ink-muted">
        {label} <span className="text-xs opacity-70">(optional)</span>
      </span>

      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((img, i) => (
            <li key={img.src} className="flex items-center gap-3 rounded-md border border-line p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb ?? img.src} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
              {withAlt ? (
                <input
                  value={img.alt}
                  onChange={(e) => onChange(value.map((v, k) => (k === i ? { ...v, alt: e.target.value } : v)))}
                  placeholder="Describe the image (alt text, helps accessibility and search)"
                  className={`${inputClass} min-w-0 flex-1`}
                />
              ) : (
                <span className="flex-1" />
              )}
              <div className="flex shrink-0 gap-2">
                {multiple && value.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => move(i, 1)}
                      disabled={i === value.length - 1}
                      className="disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, k) => k !== i))}
                  className="text-red-600 underline underline-offset-4 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(multiple || value.length === 0) && (
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple={multiple}
          onChange={handleFiles}
          disabled={uploading}
        />
      )}
      {uploading && <span className="text-xs text-ink-muted">Uploading…</span>}
      <FormError message={error} />
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
