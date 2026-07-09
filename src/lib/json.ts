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
