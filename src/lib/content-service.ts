import { prisma } from "@/lib/prisma";
import { asImages, asSocialLinks, asStringArray } from "@/lib/json";
import {
  educationSchema,
  experienceSchema,
  formatZodError,
  privateContactSchema,
  profileSchema,
  projectSchema,
  skillSchema,
} from "@/lib/admin-schemas";
import { applyLifecycle, viewWhere, type Entity, type LifecycleAction, type LifecycleView } from "@/lib/lifecycle";
import { ensureItemSlugs, slugify, uniqueProjectSlug } from "@/lib/slug";
import { getTranslations, parseProvided, saveTranslation, setManualTranslation, TranslationFailed, type TEntity } from "@/lib/translations";
import type { Locale } from "@/lib/i18n/config";

// Content operations shared by the MCP server (and the export code). Every
// write goes through the same zod schemas the admin forms use, so an AI client
// can't store anything the admin UI would reject.

type Row = Record<string, unknown>;
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const life = (r: { archivedAt: Date | null; deletedAt: Date | null }) => ({
  archivedAt: iso(r.archivedAt),
  deletedAt: iso(r.deletedAt),
});

/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeExperience(r: any, withId = false): Row {
  return {
    ...(withId ? { id: r.id } : {}),
    sourceLang: r.sourceLang ?? "en",
    slug: r.slug ?? null,
    company: r.company,
    title: r.title,
    location: r.location,
    logoPath: r.logoPath,
    startDate: iso(r.startDate),
    endDate: iso(r.endDate),
    description: r.description,
    bullets: asStringArray(r.bullets),
    tags: asStringArray(r.tags),
    sortIndex: r.sortIndex,
    ...life(r),
  };
}
export function serializeEducation(r: any, withId = false): Row {
  return {
    ...(withId ? { id: r.id } : {}),
    sourceLang: r.sourceLang ?? "en",
    slug: r.slug ?? null,
    institution: r.institution,
    degree: r.degree,
    field: r.field,
    logoPath: r.logoPath,
    startDate: iso(r.startDate),
    endDate: iso(r.endDate),
    description: r.description,
    sortIndex: r.sortIndex,
    ...life(r),
  };
}
export function serializeProject(r: any, withId = false): Row {
  return {
    ...(withId ? { id: r.id } : {}),
    sourceLang: r.sourceLang ?? "en",
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    description: r.description,
    techStack: asStringArray(r.techStack),
    repoUrl: r.repoUrl,
    liveUrl: r.liveUrl,
    images: asImages(r.images),
    featured: r.featured,
    category: r.category ?? "",
    status: r.status ?? "",
    startDate: iso(r.startDate),
    endDate: iso(r.endDate),
    sortIndex: r.sortIndex,
    ...life(r),
  };
}
export function serializeSkill(r: any, withId = false): Row {
  return {
    ...(withId ? { id: r.id } : {}),
    sourceLang: r.sourceLang ?? "en",
    name: r.name,
    category: r.category,
    proficiency: r.proficiency,
    sortIndex: r.sortIndex,
    ...life(r),
  };
}
export function serializeProfile(p: any): Row {
  return {
    sourceLang: p.sourceLang ?? "en",
    name: p.name,
    tagline: p.tagline,
    bio: p.bio,
    publicEmail: p.publicEmail,
    location: p.location,
    socialLinks: asSocialLinks(p.socialLinks),
    avatarPath: p.avatarPath,
    resumePath: p.resumePath,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SERIALIZERS: Record<Entity, (r: never, withId?: boolean) => Row> = {
  experience: serializeExperience,
  education: serializeEducation,
  projects: serializeProject,
  skills: serializeSkill,
};

export class ContentError extends Error {}

function delegate(entity: Entity) {
  switch (entity) {
    case "experience":
      return prisma.experience;
    case "education":
      return prisma.education;
    case "projects":
      return prisma.project;
    case "skills":
      return prisma.skill;
  }
}

export async function listItems(entity: Entity, view: LifecycleView): Promise<Row[]> {
  const rows = await (delegate(entity) as unknown as {
    findMany(a: object): Promise<unknown[]>;
  }).findMany({ where: viewWhere[view], orderBy: { sortIndex: "asc" }, include: LINK_INCLUDE[entity] });
  return rows.map((r) => ({ ...SERIALIZERS[entity](r as never, true), ...linkIds(entity, r as Row) }));
}

// Links between items (many-to-many). Education has no projects of its own: they come via experience.
const idOnly = { select: { id: true } };
const LINK_INCLUDE: Record<Entity, object | undefined> = {
  experience: { projects: idOnly, education: idOnly },
  education: { experiences: idOnly },
  projects: { experiences: idOnly },
  skills: undefined,
};
const ids = (v: unknown) => (Array.isArray(v) ? (v as { id: string }[]).map((x) => x.id) : []);
function linkIds(entity: Entity, row: Row): Row {
  switch (entity) {
    case "experience":
      return { projectIds: ids(row.projects), educationIds: ids(row.education) };
    case "education":
    case "projects":
      return { experienceIds: ids(row.experiences) };
    default:
      return {};
  }
}

export async function getItem(entity: Entity, id: string): Promise<Row> {
  const row = await (delegate(entity) as unknown as { findUnique(a: object): Promise<unknown> }).findUnique({
    where: { id },
    include: LINK_INCLUDE[entity],
  });
  if (!row) throw new ContentError(`No ${entity} item with id "${id}".`);
  return { ...SERIALIZERS[entity](row as never, true), ...linkIds(entity, row as Row), translations: await getTranslations(entity, id, row as Row) };
}

/** Splits a `translation` entry off the incoming data (it is stored separately, not on the item). */
function splitTranslation(data: Row): { data: Row; translation: unknown } {
  const { translation, ...rest } = data;
  return { data: rest, translation };
}

async function afterSave(entity: TEntity, id: string, row: unknown, translation: unknown) {
  if (entity === "experience" || entity === "education") await ensureItemSlugs(); // detail-page URL
  return saveTranslation({ entity, id, row: row as Row, provided: parseProvided(entity, translation) });
}

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

/** Validates `data` for the entity and returns Prisma-ready fields. */
type Mode = "create" | "update";
/** Prisma relation input for a list of ids; undefined (not given) leaves the links untouched. */
const rel = (list: string[] | undefined, mode: Mode) =>
  list === undefined ? undefined : mode === "create" ? { connect: list.map((id) => ({ id })) } : { set: list.map((id) => ({ id })) };

async function prepare(entity: Entity, data: Row, excludeProjectId?: string, mode: Mode = "update"): Promise<Row> {
  switch (entity) {
    case "experience": {
      const r = experienceSchema.safeParse(data);
      if (!r.success) throw new ContentError(formatZodError(r.error));
      const { startDate, endDate, projectIds, educationIds, ...rest } = r.data;
      return {
        ...rest,
        startDate: toDate(startDate),
        endDate: toDate(endDate),
        projects: rel(projectIds, mode),
        education: rel(educationIds, mode),
      };
    }
    case "education": {
      const r = educationSchema.safeParse(data);
      if (!r.success) throw new ContentError(formatZodError(r.error));
      const { startDate, endDate, experienceIds, ...rest } = r.data;
      return { ...rest, startDate: toDate(startDate), endDate: toDate(endDate), experiences: rel(experienceIds, mode) };
    }
    case "projects": {
      const r = projectSchema.safeParse(data);
      if (!r.success) throw new ContentError(formatZodError(r.error));
      const { repoUrl, liveUrl, slug, experienceIds, startDate, endDate, ...rest } = r.data;
      const finalSlug = slug || (await uniqueProjectSlug(slugify(rest.title), excludeProjectId));
      return {
        ...rest,
        slug: finalSlug,
        repoUrl: repoUrl || null,
        liveUrl: liveUrl || null,
        startDate: toDate(startDate),
        endDate: toDate(endDate),
        experiences: rel(experienceIds, mode),
      };
    }
    case "skills": {
      const r = skillSchema.safeParse(data);
      if (!r.success) throw new ContentError(formatZodError(r.error));
      return { ...r.data, proficiency: r.data.proficiency ?? null };
    }
  }
}

async function guardSlug<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") throw new ContentError("That project slug is already in use.");
    throw err;
  }
}

export async function createItem(entity: Entity, input: Row): Promise<Row> {
  const { data, translation } = splitTranslation(input);
  const fields = await prepare(entity, data, undefined, "create");
  const row = await guardSlug(() =>
    (delegate(entity) as unknown as { create(a: object): Promise<unknown> }).create({ data: fields }),
  );
  const id = (row as { id: string }).id;
  const status = await afterSave(entity, id, row, translation);
  return { ...(await getItem(entity, id)), translationStatus: status };
}

/** Partial update: the patch is merged over the current item, then validated as a whole. */
export async function updateItem(entity: Entity, id: string, input: Row): Promise<Row> {
  const { data: patch, translation } = splitTranslation(input);
  const current = await getItem(entity, id);
  // id and lifecycle fields aren't editable here (lifecycle changes go through setLifecycle).
  const drop = ["id", "archivedAt", "deletedAt", "translations", "translationStatus", "projectIds", "educationIds", "experienceIds"];
  const strip = (r: Row) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k)));
  const editable = strip(current);
  // Link lists are only changed when the caller passes them explicitly.
  const patchFields = Object.fromEntries(Object.entries(patch).filter(([k]) => !["id", "archivedAt", "deletedAt"].includes(k)));
  const fields = await prepare(entity, { ...editable, ...patchFields }, entity === "projects" ? id : undefined);
  const row = await guardSlug(() =>
    (delegate(entity) as unknown as { update(a: object): Promise<unknown> }).update({ where: { id }, data: fields }),
  );
  const status = await afterSave(entity, id, row, translation);
  return { ...(await getItem(entity, id)), translationStatus: status };
}

/** Stores a hand-written translation for an item (MCP `set_translation`). */
export async function setItemTranslation(entity: TEntity, id: string, data: Row, lang?: Locale): Promise<Row> {
  const row = entity === "profile" ? await prisma.profile.findUnique({ where: { id: 1 } }) : await rawRow(entity, id);
  if (!row) throw new ContentError(entity === "profile" ? "There is no profile yet." : `No ${entity} item with id "${id}".`);
  try {
    await setManualTranslation(entity, entity === "profile" ? "1" : id, row as Row, data, lang);
  } catch (err) {
    if (err instanceof TranslationFailed) throw new ContentError(err.message);
    throw err;
  }
  return entity === "profile" ? ((await getProfileRow()) as Row) : getItem(entity as Entity, id);
}

async function rawRow(entity: Entity, id: string): Promise<unknown> {
  return (delegate(entity) as unknown as { findUnique(a: object): Promise<unknown> }).findUnique({ where: { id } });
}

export async function setLifecycle(entity: Entity, id: string, action: Exclude<LifecycleAction, "purge">): Promise<Row> {
  await getItem(entity, id); // 404-style error for unknown ids
  await applyLifecycle(entity, id, action);
  return getItem(entity, id);
}

export async function getProfileRow(): Promise<Row | null> {
  const p = await prisma.profile.findUnique({ where: { id: 1 } });
  return p ? { ...serializeProfile(p), translations: await getTranslations("profile", "1", p) } : null;
}

export async function updateProfile(input: Row): Promise<Row> {
  const { data: patch, translation } = splitTranslation(input);
  const { translations: _t, ...current } = ((await getProfileRow()) ?? {}) as Row;
  void _t;
  const r = profileSchema.safeParse({ ...current, ...patch });
  if (!r.success) throw new ContentError(formatZodError(r.error));
  const row = await prisma.profile.upsert({ where: { id: 1 }, create: { id: 1, ...r.data }, update: r.data });
  const status = await afterSave("profile", "1", row, translation);
  return { ...((await getProfileRow()) as Row), translationStatus: status };
}

export async function getPrivateContact(): Promise<Row | null> {
  const c = await prisma.privateContact.findUnique({ where: { id: 1 } });
  return c ? { email: c.email, phone: c.phone } : null;
}

export async function updatePrivateContact(patch: Row): Promise<Row> {
  const current = (await getPrivateContact()) ?? {};
  const r = privateContactSchema.safeParse({ ...current, ...patch });
  if (!r.success) throw new ContentError(formatZodError(r.error));
  const row = await prisma.privateContact.upsert({ where: { id: 1 }, create: { id: 1, ...r.data }, update: r.data });
  return { email: row.email, phone: row.phone };
}
