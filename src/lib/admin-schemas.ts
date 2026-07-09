import { z } from "zod";

const dateString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  tagline: z.string().trim().min(1).max(300),
  bio: z.string().trim().min(1).max(10000),
  publicEmail: z.string().trim().email().max(320),
  location: z.string().trim().min(1).max(200),
  socialLinks: z.array(z.object({ label: z.string().min(1).max(100), url: z.string().url() })),
  avatarPath: z.string().max(500).nullable().optional(),
  resumePath: z.string().max(500).nullable().optional(),
});

export const privateContactSchema = z.object({
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(1).max(50),
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).nullable().optional(),
  startDate: dateString,
  endDate: dateString.nullable().optional(),
  description: z.string().trim().min(1).max(5000),
  bullets: z.array(z.string().trim().min(1).max(500)),
  tags: z.array(z.string().trim().min(1).max(100)),
  sortIndex: z.number().int().default(0),
});

export const educationSchema = z.object({
  institution: z.string().trim().min(1).max(200),
  degree: z.string().trim().min(1).max(200),
  field: z.string().trim().max(200).nullable().optional(),
  startDate: dateString,
  endDate: dateString.nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  sortIndex: z.number().int().default(0),
});

export const projectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated"),
  summary: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10000),
  techStack: z.array(z.string().trim().min(1).max(100)),
  repoUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  liveUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  images: z.array(z.string().max(500)),
  featured: z.boolean().default(false),
  status: z.enum(["active", "archived"]).default("active"),
  sortIndex: z.number().int().default(0),
});

export const skillSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  proficiency: z.number().int().min(0).max(100),
  sortIndex: z.number().int().default(0),
});
