// Which content fields are translatable. Kept free of server-only imports so client components
// (the admin translation panel) can use it.

export type TEntity = "profile" | "experience" | "education" | "projects" | "skills";
export type FieldKind = "text" | "textarea" | "lines";
export type FieldSpec = { name: string; label: string; kind: FieldKind };
export type FieldValues = Record<string, string | string[]>;

/** Which fields get translated. Names, companies, dates, tags and links are language-neutral. */
export const TRANSLATABLE: Record<TEntity, FieldSpec[]> = {
  profile: [
    { name: "tagline", label: "Tagline", kind: "text" },
    { name: "bio", label: "Bio", kind: "textarea" },
    { name: "location", label: "Location", kind: "text" },
  ],
  experience: [
    { name: "title", label: "Job title", kind: "text" },
    { name: "location", label: "Location", kind: "text" },
    { name: "description", label: "Description", kind: "textarea" },
    { name: "bullets", label: "Bullet points", kind: "lines" },
  ],
  education: [
    { name: "degree", label: "Degree", kind: "text" },
    { name: "field", label: "Field of study", kind: "text" },
    { name: "description", label: "Description", kind: "textarea" },
  ],
  projects: [
    { name: "category", label: "Category", kind: "text" },
    { name: "summary", label: "Summary", kind: "text" },
    { name: "description", label: "Description", kind: "textarea" },
  ],
  skills: [{ name: "category", label: "Category", kind: "text" }],
};

export const isTEntity = (v: unknown): v is TEntity => typeof v === "string" && v in TRANSLATABLE;
