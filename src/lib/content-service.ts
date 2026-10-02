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
import { slugify, uniqueProjectSlug } from "@/lib/slug";

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
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    description: r.description,
    techStack: asStringArray(r.techStack),
    repoUrl: r.repoUrl,
    liveUrl: r.liveUrl,
    images: asImages(r.images),
    featured: r.featured,
    sortIndex: r.sortIndex,
    ...life(r),
  };
}
export function serializeSkill(r: any, withId = false): Row {
  return {
    ...(withId ? { id: r.id } : {}),
    name: r.name,
    category: r.category,
    proficiency: r.proficiency,
    sortIndex: r.sortIndex,
    ...life(r),
  };
}
export function serializeProfile(p: any): Row {
  return {
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
  }).findMany({ where: viewWhere[view], orderBy: { sortIndex: "asc" } });
  return rows.map((r) => SERIALIZERS[entity](r as never, true));
}

export async function getItem(entity: Entity, id: string): Promise<Row> {
  const row = await (delegate(entity) as unknown as { findUnique(a: object): Promise<unknown> }).findUnique({
    where: { id },
  });
  if (!row) throw new ContentError(`No ${entity} item with id "${id}".`);
  return SERIALIZERS[entity](row as never, true);
}

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

/** Validates `data` for the entity and returns Prisma-ready fields. */
async function prepare(entity: Entity, data: Row, excludeProjectId?: string): Promise<Row> {
  switch (entity) {
    case "experience": {
      const r = experienceSchema.safeParse(data);
      if (!r.success) throw new ContentError(formatZodError(r.error));
      const { startDate, endDate, ...rest } = r.data;
      return { ...rest, startDate: toDate(startDate), endDate: toDate(endDate) };
    }
    case "education": {
      const r = educationSchema.safeParse(data);
      if (!r.success) throw new ContentError(formatZodError(r.error));
      const { startDate, endDate, ...rest } = r.data;
      return { ...rest, startDate: toDate(startDate), endDate: toDate(endDate) };
    }
    case "projects": {
      const r = projectSchema.safeParse(data);
      if (!r.success) throw new ContentError(formatZodError(r.error));
      const { repoUrl, liveUrl, slug, ...rest } = r.data;
      const finalSlug = slug || (await uniqueProjectSlug(slugify(rest.title), excludeProjectId));
      return { ...rest, slug: finalSlug, repoUrl: repoUrl || null, liveUrl: liveUrl || null };
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

export async function createItem(entity: Entity, data: Row): Promise<Row> {
  const fields = await prepare(entity, data);
  const row = await guardSlug(() =>
    (delegate(entity) as unknown as { create(a: object): Promise<unknown> }).create({ data: fields }),
  );
  return SERIALIZERS[entity](row as never, true);
}

/** Partial update: the patch is merged over the current item, then validated as a whole. */
export async function updateItem(entity: Entity, id: string, patch: Row): Promise<Row> {
  const current = await getItem(entity, id);
  // id and lifecycle fields aren't editable here (lifecycle changes go through setLifecycle).
  const drop = ["id", "archivedAt", "deletedAt"];
  const strip = (r: Row) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k)));
  const editable = strip(current);
  const patchFields = strip(patch);
  const fields = await prepare(entity, { ...editable, ...patchFields }, entity === "projects" ? id : undefined);
  const row = await guardSlug(() =>
    (delegate(entity) as unknown as { update(a: object): Promise<unknown> }).update({ where: { id }, data: fields }),
  );
  return SERIALIZERS[entity](row as never, true);
}

export async function setLifecycle(entity: Entity, id: string, action: Exclude<LifecycleAction, "purge">): Promise<Row> {
  await getItem(entity, id); // 404-style error for unknown ids
  await applyLifecycle(entity, id, action);
  return getItem(entity, id);
}

export async function getProfileRow(): Promise<Row | null> {
  const p = await prisma.profile.findUnique({ where: { id: 1 } });
  return p ? serializeProfile(p) : null;
}

export async function updateProfile(patch: Row): Promise<Row> {
  const current = await getProfileRow();
  const r = profileSchema.safeParse({ ...(current ?? {}), ...patch });
  if (!r.success) throw new ContentError(formatZodError(r.error));
  const row = await prisma.profile.upsert({ where: { id: 1 }, create: { id: 1, ...r.data }, update: r.data });
  return serializeProfile(row);
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
