import { z } from "zod";

/** Collapses a failed zod parse into one human-readable sentence for the admin forms. */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
}

// Only one identifying field per entity is required (so a row is never
// blank); everything else may be left empty. Empty strings are accepted
// wherever the DB stores text, and public pages skip empty values.

const sourceLang = z.enum(["en", "nl"]).default("en");
const optionalText = (max: number) => z.string().trim().max(max).default("");
const optionalDate = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Invalid date");
const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(320)]).default("");
const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(2000)]).nullable().optional();

export const profileSchema = z.object({
  sourceLang,
  name: z.string().trim().min(1, "Name is required").max(200),
  tagline: optionalText(300),
  bio: optionalText(10000),
  publicEmail: optionalEmail,
  location: optionalText(200),
  socialLinks: z.array(z.object({ label: z.string().trim().min(1).max(100), url: z.string().trim().url() })).default([]),
  avatarPath: z.string().max(500).nullable().optional(),
  resumePath: z.string().max(500).nullable().optional(),
});

export const privateContactSchema = z.object({
  email: optionalEmail,
  phone: optionalText(50),
});

export const experienceSchema = z
  .object({
    sourceLang,
    company: optionalText(200),
    title: optionalText(200),
    location: z.string().trim().max(200).nullable().optional(),
    logoPath: z.string().max(500).nullable().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    description: optionalText(5000),
    bullets: z.array(z.string().trim().min(1).max(500)).default([]),
    tags: z.array(z.string().trim().min(1).max(100)).default([]),
    sortIndex: z.number().int().default(0),
    // Links (ids). undefined = leave the current links alone.
    projectIds: z.array(z.string()).optional(),
    educationIds: z.array(z.string()).optional(),
  })
  .refine((v) => v.title || v.company, { message: "Enter a job title or a company", path: ["title"] });

export const educationSchema = z
  .object({
    sourceLang,
    institution: optionalText(200),
    degree: optionalText(200),
    field: z.string().trim().max(200).nullable().optional(),
    logoPath: z.string().max(500).nullable().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    description: z.string().trim().max(5000).nullable().optional(),
    sortIndex: z.number().int().default(0),
    experienceIds: z.array(z.string()).optional(),
  })
  .refine((v) => v.institution || v.degree, { message: "Enter an institution or a degree", path: ["institution"] });

/** "" = not specified (no badge). */
export const PROJECT_STATUSES = ["", "ongoing", "completed", "discontinued", "experiment"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const projectSchema = z.object({
  sourceLang,
  title: z.string().trim().min(1, "Title is required").max(200),
  // Blank = generated from the title by the API route.
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, "Slug must be lowercase, alphanumeric, and hyphen-separated")
    .default(""),
  summary: optionalText(500),
  description: optionalText(10000),
  techStack: z.array(z.string().trim().min(1).max(100)).default([]),
  repoUrl: optionalUrl,
  liveUrl: optionalUrl,
  images: z
    .array(
      z.preprocess(
        (v) => (typeof v === "string" ? { src: v, alt: "" } : v),
        z.object({
          src: z.string().max(500),
          alt: z.string().trim().max(300).default(""),
          thumb: z.string().max(500).optional(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
        }),
      ),
    )
    .default([]),
  featured: z.boolean().default(false),
  category: optionalText(100),
  status: z.enum(PROJECT_STATUSES).default(""),
  startDate: optionalDate,
  endDate: optionalDate,
  sortIndex: z.number().int().default(0),
  experienceIds: z.array(z.string()).optional(),
});

export const skillSchema = z.object({
  sourceLang,
  name: z.string().trim().min(1, "Name is required").max(100),
  category: optionalText(100),
  proficiency: z.number().int().min(0).max(100).nullable().optional(),
  sortIndex: z.number().int().default(0),
});
