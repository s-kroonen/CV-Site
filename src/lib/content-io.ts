import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { asImages } from "@/lib/json";
import {
  serializeEducation,
  serializeExperience,
  serializeProfile,
  serializeProject,
  serializeSkill,
} from "@/lib/content-service";
import {
  educationSchema,
  experienceSchema,
  privateContactSchema,
  profileSchema,
  projectSchema,
  skillSchema,
} from "@/lib/admin-schemas";
import { slugify } from "@/lib/slug";
import { hasContent, sanitizeFields, type FieldValues, type TEntity } from "@/lib/translations";
import { isLocale } from "@/lib/i18n/config";
import { uploadDir } from "@/lib/uploads";

// Content export/import. The same document shape is used for both directions,
// so an export from one host can be restored on the other. Lifecycle state
// (archived / trashed) is part of the data. Uploaded images travel in a ZIP.

export const EXPORT_VERSION = 1;
export const SECTIONS = ["experience", "education", "projects", "skills"] as const;
export type Section = (typeof SECTIONS)[number];

type Row = Record<string, unknown>;
export type ExportDoc = {
  version: number;
  exportedAt: string;
  profile?: Row | null;
  privateContact?: Row | null;
  experience: Row[];
  education: Row[];
  projects: Row[];
  skills: Row[];
};

// ---------------------------------------------------------------- export

export async function buildExport(includePrivate: boolean): Promise<ExportDoc> {
  const [profile, privateContact, experience, education, projects, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { id: 1 } }),
    includePrivate ? prisma.privateContact.findUnique({ where: { id: 1 } }) : null,
    prisma.experience.findMany({ orderBy: { sortIndex: "asc" } }),
    prisma.education.findMany({ orderBy: { sortIndex: "asc" } }),
    prisma.project.findMany({ orderBy: { sortIndex: "asc" } }),
    prisma.skill.findMany({ orderBy: { sortIndex: "asc" } }),
  ]);

  // Translations travel inside the item they belong to ({ nl: { fields..., manual } }).
  const all = await prisma.translation.findMany();
  const byItem = new Map<string, Record<string, Row>>();
  for (const t of all) {
    const key = `${t.entity}:${t.entityId}`;
    byItem.set(key, { ...(byItem.get(key) ?? {}), [t.lang]: { ...(t.fields as Row), manual: t.manual } });
  }
  const withTranslations = (entity: string, id: string, exported: Row): Row => {
    const t = byItem.get(`${entity}:${id}`);
    return t ? { ...exported, translations: t } : exported;
  };

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile && withTranslations("profile", "1", serializeProfile(profile)),
    privateContact: privateContact && { email: privateContact.email, phone: privateContact.phone },
    experience: experience.map((r) => withTranslations("experience", r.id, serializeExperience(r))),
    education: education.map((r) => withTranslations("education", r.id, serializeEducation(r))),
    projects: projects.map((r) => withTranslations("projects", r.id, serializeProject(r))),
    skills: skills.map((r) => withTranslations("skills", r.id, serializeSkill(r))),
  };
}

const UPLOAD_NAME = /^[a-f0-9-]+(-thumb)?\.(png|jpg|webp|gif)$/i;

/** Filenames under UPLOAD_DIR that the document points at (`/uploads/<name>`). */
export function referencedUploads(doc: ExportDoc): string[] {
  const names = new Set<string>();
  const add = (p: unknown) => {
    if (typeof p !== "string" || !p.startsWith("/uploads/")) return;
    const name = p.slice("/uploads/".length);
    if (UPLOAD_NAME.test(name)) names.add(name);
  };
  add(doc.profile?.avatarPath);
  add(doc.profile?.resumePath);
  [...doc.experience, ...doc.education].forEach((r) => add(r.logoPath));
  doc.projects.forEach((r) => asImages(r.images).forEach((img) => (add(img.src), add(img.thumb))));
  return [...names];
}

export async function buildZip(doc: ExportDoc): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = { "content.json": strToU8(JSON.stringify(doc, null, 2)) };
  for (const name of referencedUploads(doc)) {
    try {
      files[`uploads/${name}`] = new Uint8Array(await readFile(path.join(uploadDir(), name)));
    } catch {
      // Referenced but missing on disk: the import preview reports it from the other side.
    }
  }
  return zipSync(files, { level: 6 });
}

// ---------------------------------------------------------------- import

const lifecycle = z.object({
  archivedAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
});

const docShape = z.object({
  version: z.number().optional(),
  profile: z.unknown().optional(),
  privateContact: z.unknown().optional(),
  experience: z.array(z.unknown()).default([]),
  education: z.array(z.unknown()).default([]),
  projects: z.array(z.unknown()).default([]),
  skills: z.array(z.unknown()).default([]),
});

export type ParsedImport = { doc: unknown; uploads: Map<string, Uint8Array> };

export const MAX_IMPORT_BYTES = 30 * 1024 * 1024;

export function parseImportFile(buf: Uint8Array, filename: string): ParsedImport {
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
  if (!isZip) {
    if (!/\.json$/i.test(filename) && buf[0] !== 0x7b) throw new Error("Upload a .json or .zip export file.");
    return { doc: JSON.parse(strFromU8(buf)), uploads: new Map() };
  }
  const entries = unzipSync(buf);
  const json = entries["content.json"];
  if (!json) throw new Error("This ZIP has no content.json - is it an export from this site?");
  const uploads = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(entries)) {
    const m = /^uploads\/([^/]+)$/.exec(name);
    if (m && UPLOAD_NAME.test(m[1])) uploads.set(m[1], data);
  }
  return { doc: JSON.parse(strFromU8(json)), uploads };
}

type Dates = { archivedAt: Date | null; deletedAt: Date | null };
type PreparedTranslation = { lang: string; fields: FieldValues; manual: boolean };
type PreparedItem = { key: string; data: Row & Dates; translations: PreparedTranslation[] };
export type Prepared = {
  profile?: z.infer<typeof profileSchema>;
  profileTranslations: PreparedTranslation[];
  privateContact?: z.infer<typeof privateContactSchema>;
  experience: PreparedItem[];
  education: PreparedItem[];
  projects: PreparedItem[];
  skills: PreparedItem[];
  errors: string[];
  uploads: { found: number; missing: string[] };
};

/** Reads the translations embedded in an exported item and validates them. */
function translationsOf(entity: TEntity, raw: unknown): PreparedTranslation[] {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>).translations : undefined;
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([lang, v]) => {
    if (!isLocale(lang) || !v || typeof v !== "object") return [];
    const fields = sanitizeFields(entity, v);
    return hasContent(fields) ? [{ lang, fields, manual: (v as Record<string, unknown>).manual !== false }] : [];
  });
}

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function lifeOf(raw: unknown): Dates {
  const l = lifecycle.safeParse(raw);
  const a = l.success ? toDate(l.data.archivedAt) : null;
  const d = l.success ? toDate(l.data.deletedAt) : null;
  return { archivedAt: a && !Number.isNaN(+a) ? a : null, deletedAt: d && !Number.isNaN(+d) ? d : null };
}

/** Validates every record in an import document with the same schemas the admin forms use. */
export function prepareImport(rawDoc: unknown, uploads: Map<string, Uint8Array>): Prepared {
  const errors: string[] = [];
  const out: Prepared = { profileTranslations: [], experience: [], education: [], projects: [], skills: [], errors, uploads: { found: 0, missing: [] } };

  const shape = docShape.safeParse(rawDoc);
  if (!shape.success || typeof rawDoc !== "object" || rawDoc === null) {
    errors.push("This file isn't a valid export (expected a JSON object with experience/education/projects/skills lists).");
    return out;
  }
  const doc = shape.data;
  if (doc.version !== undefined && doc.version > EXPORT_VERSION) {
    errors.push(`Export version ${doc.version} is newer than this site supports (${EXPORT_VERSION}).`);
  }

  const describe = (err: z.ZodError) => err.issues.map((x) => `${x.path.join(".") || "item"} ${x.message}`).join("; ");
  const fail = (label: string, i: number, err: z.ZodError) => errors.push(`${label} #${i + 1}: ${describe(err)}`);

  if (doc.profile) {
    const p = profileSchema.safeParse(doc.profile);
    if (p.success) {
      out.profile = p.data;
      out.profileTranslations = translationsOf("profile", doc.profile);
    }
    else errors.push(`profile: ${describe(p.error)}`);
  }
  if (doc.privateContact) {
    const p = privateContactSchema.safeParse(doc.privateContact);
    if (p.success) out.privateContact = p.data;
    else errors.push(`privateContact: ${describe(p.error)}`);
  }

  doc.experience.forEach((raw, i) => {
    const r = experienceSchema.safeParse(raw);
    if (!r.success) return fail("experience", i, r.error);
    const { startDate, endDate, ...rest } = r.data;
    out.experience.push({
      key: [norm(r.data.title), norm(r.data.company), norm(startDate)].join("|"),
      data: { ...rest, startDate: toDate(startDate), endDate: toDate(endDate), ...lifeOf(raw) },
      translations: translationsOf("experience", raw),
    });
  });
  doc.education.forEach((raw, i) => {
    const r = educationSchema.safeParse(raw);
    if (!r.success) return fail("education", i, r.error);
    const { startDate, endDate, ...rest } = r.data;
    out.education.push({
      key: [norm(r.data.institution), norm(r.data.degree)].join("|"),
      data: { ...rest, startDate: toDate(startDate), endDate: toDate(endDate), ...lifeOf(raw) },
      translations: translationsOf("education", raw),
    });
  });
  const slugsInFile = new Set<string>();
  doc.projects.forEach((raw, i) => {
    const r = projectSchema.safeParse(raw);
    if (!r.success) return fail("projects", i, r.error);
    const slug = r.data.slug || slugify(r.data.title);
    if (slugsInFile.has(slug)) return errors.push(`projects #${i + 1}: duplicate slug "${slug}" in the file.`);
    slugsInFile.add(slug);
    const { repoUrl, liveUrl, ...rest } = r.data;
    out.projects.push({
      key: slug,
      data: { ...rest, slug, repoUrl: repoUrl || null, liveUrl: liveUrl || null, ...lifeOf(raw) },
      translations: translationsOf("projects", raw),
    });
  });
  doc.skills.forEach((raw, i) => {
    const r = skillSchema.safeParse(raw);
    if (!r.success) return fail("skills", i, r.error);
    out.skills.push({
      key: [norm(r.data.name), norm(r.data.category)].join("|"),
      data: { ...r.data, proficiency: r.data.proficiency ?? null, ...lifeOf(raw) },
      translations: translationsOf("skills", raw),
    });
  });

  // Which referenced images does the file actually bring along (or already exist on this host)?
  const asDoc = {
    profile: doc.profile as Row | undefined,
    experience: doc.experience as Row[],
    education: doc.education as Row[],
    projects: doc.projects as Row[],
  } as unknown as ExportDoc;
  for (const name of referencedUploads(asDoc)) {
    if (uploads.has(name)) out.uploads.found++;
    else out.uploads.missing.push(name);
  }
  return out;
}

export type ImportMode = "add" | "replace";
export type SectionCounts = { total: number; create: number; skip: number };
export type ImportSummary = Record<Section, SectionCounts> & { profile: boolean };

/** Works out what would happen, without writing anything. */
export async function planImport(p: Prepared, mode: ImportMode, includeProfile: boolean) {
  const existing =
    mode === "add"
      ? {
          experience: await prisma.experience.findMany({ select: { title: true, company: true, startDate: true } }),
          education: await prisma.education.findMany({ select: { institution: true, degree: true } }),
          projects: await prisma.project.findMany({ select: { slug: true } }),
          skills: await prisma.skill.findMany({ select: { name: true, category: true } }),
        }
      : null;
  const taken: Record<Section, Set<string>> = {
    experience: new Set(
      existing?.experience.map((r) => [norm(r.title), norm(r.company), norm(r.startDate?.toISOString())].join("|")),
    ),
    education: new Set(existing?.education.map((r) => [norm(r.institution), norm(r.degree)].join("|"))),
    projects: new Set(existing?.projects.map((r) => r.slug)),
    skills: new Set(existing?.skills.map((r) => [norm(r.name), norm(r.category)].join("|"))),
  };

  const toCreate = {} as Record<Section, PreparedItem[]>;
  const summary = { profile: includeProfile && !!p.profile } as ImportSummary;
  for (const s of SECTIONS) {
    const items = p[s];
    toCreate[s] = items.filter((it) => !taken[s].has(it.key));
    summary[s] = { total: items.length, create: toCreate[s].length, skip: items.length - toCreate[s].length };
  }
  return { summary, toCreate };
}

export async function applyImport(
  p: Prepared,
  uploads: Map<string, Uint8Array>,
  mode: ImportMode,
  includeProfile: boolean,
): Promise<ImportSummary> {
  const { summary, toCreate } = await planImport(p, mode, includeProfile);

  // Images first: if this fails nothing in the database has changed yet.
  if (uploads.size) {
    await mkdir(uploadDir(), { recursive: true });
    for (const [name, data] of uploads) await writeFile(path.join(uploadDir(), name), data);
  }

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.experience.deleteMany();
      await tx.education.deleteMany();
      await tx.project.deleteMany();
      await tx.skill.deleteMany();
      await tx.translation.deleteMany();
    }
    const saveTranslations = async (entity: TEntity, id: string, items: PreparedTranslation[]) => {
      for (const t of items) {
        await tx.translation.upsert({
          where: { entity_entityId_lang: { entity, entityId: id, lang: t.lang } },
          create: { entity, entityId: id, lang: t.lang, fields: t.fields, manual: t.manual },
          update: { fields: t.fields, manual: t.manual },
        });
      }
    };
    // `as never`: rows were validated by the same zod schemas the admin API uses.
    for (const it of toCreate.experience) {
      await saveTranslations("experience", (await tx.experience.create({ data: it.data as never })).id, it.translations);
    }
    for (const it of toCreate.education) {
      await saveTranslations("education", (await tx.education.create({ data: it.data as never })).id, it.translations);
    }
    for (const it of toCreate.projects) {
      await saveTranslations("projects", (await tx.project.create({ data: it.data as never })).id, it.translations);
    }
    for (const it of toCreate.skills) {
      await saveTranslations("skills", (await tx.skill.create({ data: it.data as never })).id, it.translations);
    }

    if (includeProfile && p.profile) {
      await tx.profile.upsert({ where: { id: 1 }, create: { id: 1, ...p.profile }, update: p.profile });
      await saveTranslations("profile", "1", p.profileTranslations);
    }
    if (includeProfile && p.privateContact) {
      await tx.privateContact.upsert({ where: { id: 1 }, create: { id: 1, ...p.privateContact }, update: p.privateContact });
    }
  });

  return summary;
}
