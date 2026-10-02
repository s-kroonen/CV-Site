"use client";

import { useEffect, useMemo, useState } from "react";
import { inputClass } from "@/components/admin/fields";

type Option = { id: string; label: string; archived: boolean };

/**
 * Multi-select for linking this item to others (projects, experience, education).
 * Selected items show as removable chips; the search box filters the rest.
 */
export function RelationPicker({
  label,
  entity,
  value,
  onChange,
  hint,
}: {
  label: string;
  entity: "projects" | "experience" | "education";
  value: string[];
  onChange: (next: string[]) => void;
  hint?: string;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/options?entity=${entity}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((b) => !cancelled && (setOptions(b.items ?? []), setLoaded(true)))
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [entity]);

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => !value.includes(o.id) && (!q || o.label.toLowerCase().includes(q))).slice(0, 8);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">
        {label} <span className="text-xs opacity-70">(optional)</span>
      </span>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-ink">
              {byId.get(id)?.label ?? "…"}
              {byId.get(id)?.archived ? " (archived)" : ""}
              <button
                type="button"
                aria-label={`Unlink ${byId.get(id)?.label ?? ""}`}
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="text-ink-muted hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={loaded && options.length === 0 ? "Nothing to link yet" : "Search to link…"}
        className={inputClass}
      />
      {matches.length > 0 && (
        <ul className="max-h-48 overflow-auto rounded-md border border-line bg-paper py-1">
          {matches.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, o.id]);
                  setQuery("");
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-accent/15"
              >
                {o.label}
                {o.archived && <span className="text-ink-muted"> (archived)</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
