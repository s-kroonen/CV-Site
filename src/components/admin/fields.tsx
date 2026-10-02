"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

// Shared building blocks for the admin forms. Colours use the site's theme
// tokens (the old forms used `text-background`, which isn't a defined colour,
// so button text rendered the same colour as its background = invisible).

export const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none";

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <FieldLabel label={label} required={required} />
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        className={inputClass}
      />
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  required,
  rows = 4,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <FieldLabel label={label} required={required} />
      <textarea name={name} defaultValue={defaultValue ?? ""} required={required} rows={rows} className={inputClass} />
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="text-ink-muted">
      {label}
      {required ? <span className="text-accent"> *</span> : <span className="text-xs opacity-70"> (optional)</span>}
    </span>
  );
}

export function SubmitButton({
  pending,
  children = "Save",
  pendingLabel = "Saving…",
  disabled,
}: {
  pending: boolean;
  children?: React.ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-fit rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

/** Pulls the `error` string out of an admin API error response. */
export async function readApiError(res: Response, fallback = "Could not save. Check the fields and try again.") {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

const normalise = (s: string) => s.trim().replace(/\s+/g, " ");

/**
 * Tag picker with live search against tags already in use. Typing filters the
 * existing pool; click (or Enter / arrows) picks a match, and if nothing
 * matches exactly an "Add new" row is offered. Matching is case-insensitive
 * and a typed value that equals an existing tag in any casing reuses the
 * existing spelling, so "react" can't fork off "React".
 */
export function TagInput({
  label,
  value,
  onChange,
  pool = "tags",
  single = false,
  hint,
  placeholder = "Type to search or add…",
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  pool?: "tags" | "categories";
  single?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const [known, setKnown] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/tags?pool=${pool}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((b) => !cancelled && setKnown(Array.isArray(b.items) ? b.items : []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pool]);

  const q = normalise(query).toLowerCase();
  const taken = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);

  // Pool = server-known tags + anything picked in this session, minus what's already selected.
  const matches = useMemo(() => {
    const all = [...new Map([...known, ...value].map((t) => [t.toLowerCase(), t])).values()];
    return all
      .filter((t) => !taken.has(t.toLowerCase()) && (!q || t.toLowerCase().includes(q)))
      .sort((a, b) => {
        const ap = a.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || a.localeCompare(b);
      })
      .slice(0, 8);
  }, [known, value, taken, q]);

  const exact = q ? [...known, ...value].find((t) => t.toLowerCase() === q) : undefined;
  const canAddNew = q.length > 0 && !exact;
  const rows: { label: string; isNew: boolean }[] = [
    ...matches.map((label) => ({ label, isNew: false })),
    ...(canAddNew ? [{ label: normalise(query), isNew: true }] : []),
  ];

  function pick(tag: string) {
    const canonical = [...known, ...value].find((t) => t.toLowerCase() === tag.toLowerCase()) ?? tag;
    if (!taken.has(canonical.toLowerCase())) onChange(single ? [canonical] : [...value, canonical]);
    setQuery("");
    setActive(0);
    setOpen(!single);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === ",") {
      // Enter with nothing typed falls through so it can still submit the form.
      if (!q) {
        if (e.key === ",") e.preventDefault();
        return;
      }
      e.preventDefault();
      const row = rows[active] ?? rows[0];
      if (row) pick(row.label);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const showList = open && rows.length > 0 && !(single && value.length > 0 && !q);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">
        {label} <span className="text-xs opacity-70">(optional)</span>
      </span>
      <div
        className="relative flex flex-wrap items-center gap-2 rounded-md border border-line bg-paper px-2 py-1.5 focus-within:border-accent"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-ink">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((t) => t !== tag));
              }}
              className="text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={single && value.length ? "" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-ink outline-none placeholder:text-ink-muted/60"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute top-full left-0 z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-paper py-1 shadow-lg"
          >
            {rows.map((row, i) => (
              <li
                key={`${row.isNew}-${row.label}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(row.label);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-1.5 ${i === active ? "bg-accent/15" : ""}`}
              >
                {row.isNew ? (
                  <>
                    Add new: <strong>{row.label}</strong>
                  </>
                ) : (
                  row.label
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
