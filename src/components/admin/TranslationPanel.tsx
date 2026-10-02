"use client";

import { useEffect, useState } from "react";
import { LOCALE_NAMES, LOCALES, otherLocale, type Locale } from "@/lib/i18n/config";
import { TRANSLATABLE, type FieldValues, type TEntity } from "@/lib/translation-fields";
import { inputClass } from "@/components/admin/fields";

export type TranslationInit = { fields: FieldValues; manual: boolean; stale: boolean } | null;

const toText = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join("\n") : (v ?? ""));

/**
 * Form state for the language of an item and its translation into the other
 * language. `payload()` goes into the save request: a translation is only sent
 * when the user typed one (stored as hand-written) or pressed Translate
 * (stored as automatic). Otherwise the server keeps or refreshes it.
 */
export function useTranslation(entity: TEntity, initialSourceLang: Locale, init: TranslationInit) {
  const specs = TRANSLATABLE[entity];
  const [sourceLang, setSourceLangState] = useState<Locale>(initialSourceLang);
  const seed = (i: TranslationInit) => Object.fromEntries(specs.map((f) => [f.name, toText(i?.fields[f.name])]));
  const [values, setValues] = useState<Record<string, string>>(seed(init));
  const [edited, setEdited] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  function setSourceLang(next: Locale) {
    setSourceLangState(next);
    // The stored translation belongs to the original source language; another source means a blank slate.
    setValues(next === initialSourceLang ? seed(init) : seed(null));
    setEdited(false);
    setAutoFilled(false);
  }

  const payload = () => {
    const fields = Object.fromEntries(
      specs.map((f) => [f.name, f.kind === "lines" ? (values[f.name] ?? "").split("\n").map((s) => s.trim()).filter(Boolean) : values[f.name] ?? ""]),
    );
    const hasText = Object.values(values).some((v) => v.trim());
    return {
      sourceLang,
      ...(hasText && edited ? { translation: { fields, manual: true } } : hasText && autoFilled ? { translation: { fields, manual: false } } : {}),
    };
  };

  return { entity, init, sourceLang, setSourceLang, values, setValues, edited, setEdited, setAutoFilled, payload };
}

export type TranslationState = ReturnType<typeof useTranslation>;

/** Reads named inputs of a form as { name: text }, for use as `getSource`. */
export function readFormFields(form: HTMLFormElement | null, names: string[]): Record<string, string> {
  const data = form ? new FormData(form) : new FormData();
  return Object.fromEntries(names.map((n) => [n, String(data.get(n) ?? "")]));
}

export function TranslationPanel({
  tr,
  getSource,
}: {
  tr: TranslationState;
  /** Current source text of the translatable fields (as typed in the form). */
  getSource: () => Record<string, string>;
}) {
  const specs = TRANSLATABLE[tr.entity];
  const target = otherLocale(tr.sourceLang);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/translate")
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((b) => setAvailable(!!b.available))
      .catch(() => setAvailable(false));
  }, []);

  async function translateNow() {
    setBusy(true);
    setError(null);
    const source = getSource();
    const fields = Object.fromEntries(specs.map((f) => [f.name, f.kind === "lines" ? (source[f.name] ?? "").split("\n").filter(Boolean) : source[f.name] ?? ""]));
    const res = await fetch("/api/admin/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: tr.entity, from: tr.sourceLang, to: target, fields }),
    });
    setBusy(false);
    const body = await res.json().catch(() => null);
    if (!res.ok) return setError(typeof body?.error === "string" ? body.error : "Translation failed.");
    tr.setValues(Object.fromEntries(specs.map((f) => [f.name, toText(body.fields[f.name])])));
    tr.setEdited(false);
    tr.setAutoFilled(true);
  }

  const stale = tr.init?.stale && tr.sourceLang === otherLocale(target) && !tr.edited;

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-line p-4 text-sm">
      <legend className="px-1 text-ink-muted">Language and translation</legend>

      <label className="flex flex-wrap items-center gap-2">
        <span className="text-ink-muted">The text above is written in</span>
        <select
          value={tr.sourceLang}
          onChange={(e) => tr.setSourceLang(e.target.value as Locale)}
          className="rounded-md border border-line bg-paper px-2 py-1 text-ink"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{LOCALE_NAMES[target]} version</span>
        {tr.init?.manual && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs">written by hand</span>}
        {available && (
          <button
            type="button"
            onClick={translateNow}
            disabled={busy}
            className="rounded-md border border-line px-3 py-1 transition-colors hover:border-accent disabled:opacity-50"
          >
            {busy ? "Translating…" : "Translate automatically"}
          </button>
        )}
      </div>

      <p className="text-xs text-ink-muted">
        {available
          ? `Leave this empty and ${LOCALE_NAMES[target]} is translated automatically when you save. Text you type here is kept as written.`
          : `No translation service is configured. Write the ${LOCALE_NAMES[target]} version yourself, or leave it empty and visitors see the original text.`}
      </p>
      {stale && <p className="text-xs text-red-600 dark:text-red-400">The original text changed since this translation was made.</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {specs.map((f) => (
        <label key={f.name} className="flex flex-col gap-1">
          <span className="text-ink-muted">
            {f.label} ({target.toUpperCase()}){f.kind === "lines" && <span className="text-xs"> - one per line</span>}
          </span>
          {f.kind === "text" ? (
            <input
              value={tr.values[f.name] ?? ""}
              onChange={(e) => {
                tr.setValues({ ...tr.values, [f.name]: e.target.value });
                tr.setEdited(true);
              }}
              className={inputClass}
            />
          ) : (
            <textarea
              rows={f.kind === "lines" ? 3 : 4}
              value={tr.values[f.name] ?? ""}
              onChange={(e) => {
                tr.setValues({ ...tr.values, [f.name]: e.target.value });
                tr.setEdited(true);
              }}
              className={inputClass}
            />
          )}
        </label>
      ))}
    </fieldset>
  );
}
