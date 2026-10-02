import { z } from "zod";

const stringArraySchema = z.array(z.string());

export function asStringArray(value: unknown): string[] {
  const result = stringArraySchema.safeParse(value);
  return result.success ? result.data : [];
}

export const socialLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;

export function asSocialLinks(value: unknown): SocialLink[] {
  const result = z.array(socialLinkSchema).safeParse(value);
  return result.success ? result.data : [];
}

// Project images were originally stored as plain path strings; new uploads are
// objects with alt text and dimensions. Readers go through asImages() so both
// shapes keep working without a data migration.
export const imageSchema = z.object({
  src: z.string(),
  alt: z.string().default(""),
  thumb: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});
export type ImageItem = z.infer<typeof imageSchema>;

export function asImages(value: unknown): ImageItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [{ src: entry, alt: "" }];
    const parsed = imageSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}
