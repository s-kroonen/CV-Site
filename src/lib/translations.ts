import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/json";
import { LOCALES, isLocale, otherLocale, type Locale } from "@/lib/i18n/config";
import { TranslateError, translateTexts, translationProvider } from "@/lib/translate";

import { TRANSLATABLE, isTEntity, type FieldKind, type FieldSpec, type FieldValues, type TEntity } from "@/lib/translation-fields";
export { TRANSLATABLE, isTEntity };
export type { FieldKind, FieldSpec, FieldValues, TEntity };

// Content translation. An item's own columns hold its text in `sourceLang`;
// the other language lives in a Translation row ({ field: value }). Public
// pages overlay that row onto the item, falling back to the source text for
// anything that has no translation.


type Row = Record<string, unknown>;

/** Pulls the translatable fields out of an item, normalised to string | string[]. */
export function pickFields(entity: TEntity, row: Row): FieldValues {
  const out: FieldValues = {};
  for (const f of TRANSLATABLE[entity]) {
    const v = row[f.name];
    out[f.name] = f.kind === "lines" ? asStringArray(v) : typeof v === "string" ? v : "";
  }
  return out;
}

const isEmptyValue = (v: unknown) => (Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim());
export const hasContent = (fields: FieldValues) => Object.values(fields).some((v) => !isEmptyValue(v));

export function hashFields(fields: FieldValues): string {
  return createHash("sha1").update(JSON.stringify(fields)).digest("hex").slice(0, 16);
}

/** Cleans untrusted input down to the known translatable fields with the right types. */
export function sanitizeFields(entity: TEntity, input: unknown): FieldValues {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: FieldValues = {};
  for (const f of TRANSLATABLE[entity]) {
    const v = src[f.name];
    if (f.kind === "lines") {
      out[f.name] = (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [])
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 50);
    } else {
      out[f.name] = typeof v === "string" ? v.trim().slice(0, 10000) : "";
    }
  }
  return out;
}

// ---------------------------------------------------------------- reading

export type TranslationInfo = { lang: Locale; fields: FieldValues; manual: boolean; stale: boolean };

/** The stored translation of one item into `lang`, with an out-of-date flag. */
export async function getTranslation(entity: TEntity, id: string, lang: Locale, current: Row): Promise<TranslationInfo | null> {
  const row = await prisma.translation.findUnique({ where: { entity_entityId_lang: { entity, entityId: id, lang } } });
  if (!row) return null;
  return {
    lang,
    fields: sanitizeFields(entity, row.fields),
    manual: row.manual,
    stale: !!row.sourceHash && row.sourceHash !== hashFields(pickFields(entity, current)),
  };
}

/** All translations of an item (keyed by language), for admin and MCP views. */
export async function getTranslations(entity: TEntity, id: string, current: Row) {
  const sourceLang = isLocale(current.sourceLang) ? current.sourceLang : "en";
  const other = otherLocale(sourceLang);
  const t = await getTranslation(entity, id, other, current);
  return t ? { [other]: { ...t.fields, _manual: t.manual, _stale: t.stale } } : {};
}

/**
 * Overlays translations onto items for display in `lang`. Items already written
 * in `lang` are returned untouched; otherwise any non-empty translated field
 * replaces the source text.
 */
export async function localizeRows<T extends { id: string; sourceLang: string }>(
  entity: TEntity,
  rows: T[],
  lang: Locale,
): Promise<T[]> {
  const need = rows.filter((r) => r.sourceLang !== lang);
  if (need.length === 0) return rows;
  const found = await prisma.translation.findMany({ where: { entity, lang, entityId: { in: need.map((r) => r.id) } } });
  const byId = new Map(found.map((t) => [t.entityId, sanitizeFields(entity, t.fields)]));
  return rows.map((row) => {
    const t = byId.get(row.id);
    if (!t || row.sourceLang === lang) return row;
    const merged: Row = { ...row };
    for (const [k, v] of Object.entries(t)) if (!isEmptyValue(v)) merged[k] = v;
    return merged as T;
  });
}

// ---------------------------------------------------------------- writing

export class TranslationFailed extends Error {}

/**
 * Reads a translation supplied with a save. Accepts the admin form's { fields, manual }
 * or a plain { fieldName: value } object (MCP); returns null when nothing was supplied.
 */
export function parseProvided(entity: TEntity, raw: unknown): { fields: FieldValues; manual: boolean } | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const hasWrapper = obj.fields && typeof obj.fields === "object";
  const fields = sanitizeFields(entity, hasWrapper ? obj.fields : obj);
  if (!hasContent(fields)) return null;
  return { fields, manual: hasWrapper ? obj.manual !== false : true };
}

/** Machine-translates an item's source fields into the other language. Throws TranslateError. */
export async function autoTranslateFields(entity: TEntity, source: FieldValues, from: Locale, to: Locale): Promise<FieldValues> {
  const specs = TRANSLATABLE[entity];
  // Flatten (strings and lines) into one request, then put the pieces back together.
  const flat: string[] = [];
  const slots = specs.map((f) => {
    const v = source[f.name];
    const parts = Array.isArray(v) ? v : [v ?? ""];
    const start = flat.length;
    flat.push(...parts.map(String));
    return { f, start, count: parts.length };
  });
  const translated = await translateTexts(flat, from, to);
  const out: FieldValues = {};
  for (const { f, start, count } of slots) {
    const part = translated.slice(start, start + count);
    out[f.name] = f.kind === "lines" ? part : (part[0] ?? "");
  }
  return out;
}

export type SaveResult = { status: "saved-manual" | "auto-translated" | "kept-manual" | "none" | "failed"; message?: string };

/**
 * Called after an item is saved. `provided` = a translation typed by hand in the admin
 * form (manual) or produced by the form's Translate button (manual=false).
 * Rules: provided text wins; otherwise a hand-written translation is never touched;
 * otherwise, with a provider configured, the translation is refreshed automatically.
 */
export async function saveTranslation(args: {
  entity: TEntity;
  id: string;
  row: Row; // the saved item (base text in its sourceLang)
  provided?: { fields: FieldValues; manual: boolean } | null;
}): Promise<SaveResult> {
  const { entity, id, row, provided } = args;
  const from: Locale = isLocale(row.sourceLang) ? row.sourceLang : "en";
  const to = otherLocale(from);
  const source = pickFields(entity, row);
  const where = { entity_entityId_lang: { entity, entityId: id, lang: to } };
  const existing = await prisma.translation.findUnique({ where });

  const write = (fields: FieldValues, manual: boolean) =>
    prisma.translation.upsert({
      where,
      create: { entity, entityId: id, lang: to, fields, manual, sourceHash: hashFields(source) },
      update: { fields, manual, sourceHash: hashFields(source) },
    });

  if (provided && hasContent(provided.fields)) {
    await write(provided.fields, provided.manual);
    return { status: provided.manual ? "saved-manual" : "auto-translated" };
  }
  if (existing?.manual) return { status: "kept-manual" };
  if (!hasContent(source)) {
    if (existing) await prisma.translation.delete({ where });
    return { status: "none" };
  }
  if (!translationProvider()) return { status: "none" };

  try {
    await write(await autoTranslateFields(entity, source, from, to), false);
    return { status: "auto-translated" };
  } catch (err) {
    return { status: "failed", message: err instanceof TranslateError ? err.message : "Automatic translation failed." };
  }
}

/** Direct write used by the MCP `set_translation` tool and the import: always counts as hand-written. */
export async function setManualTranslation(entity: TEntity, id: string, row: Row, input: unknown, lang?: Locale) {
  const from: Locale = isLocale(row.sourceLang) ? row.sourceLang : "en";
  const to = lang ?? otherLocale(from);
  if (to === from) throw new TranslationFailed(`This item is written in ${from}; translate it into ${otherLocale(from)}.`);
  const fields = sanitizeFields(entity, input);
  if (!hasContent(fields)) throw new TranslationFailed("No translatable fields were given.");
  const source = pickFields(entity, row);
  const where = { entity_entityId_lang: { entity, entityId: id, lang: to } };
  await prisma.translation.upsert({
    where,
    create: { entity, entityId: id, lang: to, fields, manual: true, sourceHash: hashFields(source) },
    update: { fields, manual: true, sourceHash: hashFields(source) },
  });
  return fields;
}

export async function deleteTranslations(entity: TEntity, id: string) {
  await prisma.translation.deleteMany({ where: { entity, entityId: id } });
}

export { LOCALES };

/** The stored translation of an item into the language it is NOT written in, for the admin forms. */
export async function loadTranslationInit(entity: TEntity, id: string, row: Row) {
  const from: Locale = isLocale(row.sourceLang) ? row.sourceLang : "en";
  const t = await getTranslation(entity, id, otherLocale(from), row);
  return t ? { fields: t.fields, manual: t.manual, stale: t.stale } : null;
}
