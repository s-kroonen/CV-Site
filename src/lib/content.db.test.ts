import { beforeEach, describe, expect, it } from "vitest";
import { createItem, getItem, listItems, setLifecycle, updateItem } from "@/lib/content-service";
import { getEducationBySlug, getExperienceBySlug, getProjectBySlug } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db";

type Item = { id: string; slug: string; projectIds?: string[]; educationIds?: string[]; experienceIds?: string[] };

beforeEach(resetDb);

async function seed() {
  const alpha = (await createItem("projects", { title: "Alpha", summary: "a" })) as Item;
  const beta = (await createItem("projects", { title: "Beta", summary: "b" })) as Item;
  const edu = (await createItem("education", { institution: "Uni", degree: "BSc" })) as Item;
  const exp = (await createItem("experience", {
    title: "Intern",
    company: "Co",
    projectIds: [alpha.id, beta.id],
    educationIds: [edu.id],
  })) as Item;
  return { alpha, beta, edu, exp };
}

describe("slugs", () => {
  it("are generated on create, unique, and stable when the title changes", async () => {
    const a = (await createItem("experience", { title: "Dev", company: "Acme" })) as Item;
    const b = (await createItem("experience", { title: "Dev", company: "Acme" })) as Item;
    expect(a.slug).toBe("dev-acme");
    expect(b.slug).toBe("dev-acme-2");
    await updateItem("experience", a.id, { title: "Lead" });
    expect(((await getItem("experience", a.id)) as Item).slug).toBe("dev-acme");
  });

  it("generate project slugs from the title and report collisions", async () => {
    const p = (await createItem("projects", { title: "Café Ünïcode" })) as Item;
    expect(p.slug).toBe("cafe-unicode");
    await expect(createItem("projects", { title: "x", slug: "cafe-unicode" })).rejects.toThrow(/slug/i);
  });
});

describe("validation", () => {
  it("needs one identifying field and accepts the rest empty", async () => {
    await expect(createItem("experience", { title: "", company: "" })).rejects.toThrow(/title or a company/i);
    await expect(createItem("education", {})).rejects.toThrow(/institution or a degree/i);
    await expect(createItem("skills", { category: "x" })).rejects.toThrow(/name/i);
    expect(await createItem("skills", { name: "Rust" })).toMatchObject({ name: "Rust", category: "", proficiency: null });
  });
});

describe("links between experience, projects and education", () => {
  it("show up on every detail page, including projects reached through experience", async () => {
    const { alpha, edu, exp } = await seed();

    const e = await getExperienceBySlug(exp.slug, "en");
    expect(e?.projects.map((p) => p.title).sort()).toEqual(["Alpha", "Beta"]);
    expect(e?.education.map((x) => x.degree)).toEqual(["BSc"]);

    expect((await getProjectBySlug(alpha.slug, "en"))?.experiences.map((x) => x.title)).toEqual(["Intern"]);

    const ed = await getEducationBySlug(edu.slug, "en");
    expect(ed?.experiences.map((x) => x.title)).toEqual(["Intern"]);
    expect(ed?.projects.map((p) => p.title).sort()).toEqual(["Alpha", "Beta"]); // derived, never direct
  });

  it("are kept by updates that omit them and replaced by updates that pass them", async () => {
    const { alpha, beta, exp } = await seed();
    await updateItem("experience", exp.id, { description: "changed" });
    expect(((await getItem("experience", exp.id)) as Item).projectIds).toHaveLength(2);

    await updateItem("experience", exp.id, { projectIds: [beta.id] });
    expect(((await getItem("experience", exp.id)) as Item).projectIds).toEqual([beta.id]);
    expect((await getProjectBySlug(alpha.slug, "en"))?.experiences).toHaveLength(0);

    const listed = (await listItems("experience", "active")) as Item[];
    expect(listed[0].projectIds).toEqual([beta.id]);
  });

  it("education has no project link at all", async () => {
    const { alpha } = await seed();
    const e = (await createItem("education", { institution: "X", degree: "Y", projectIds: [alpha.id] })) as Item;
    expect(e).not.toHaveProperty("projectIds");
    expect(await prisma.education.findUnique({ where: { id: e.id }, include: { experiences: true } })).not.toHaveProperty("projects");
  });
});

describe("project category, status and period", () => {
  it("are stored, validated and translatable", async () => {
    const p = (await createItem("projects", {
      title: "Grouped",
      category: "Homelab",
      status: "on_hold",
      startDate: "2025-04-01",
      endDate: "2025-06-12",
      translation: { category: "Thuislab" },
    })) as Item & { category: string; status: string; startDate: string; translations: Record<string, Record<string, unknown>> };
    expect(p).toMatchObject({ category: "Homelab", status: "on_hold", startDate: "2025-04-01T00:00:00.000Z" });
    expect(p.translations.nl.category).toBe("Thuislab");
    const nl = await getProjectBySlug(p.slug, "nl");
    expect(nl?.category).toBe("Thuislab");
    expect((await getProjectBySlug(p.slug, "en"))?.category).toBe("Homelab");
    await expect(createItem("projects", { title: "Bad", status: "finished" })).rejects.toThrow(/status/i);
    expect(((await createItem("projects", { title: "School", kind: "education" })) as { kind: string }).kind).toBe("education");
    await expect(createItem("projects", { title: "Bad kind", kind: "hobby" })).rejects.toThrow(/kind/i);
  });
});

describe("archive and trash", () => {
  it("hide items from public pages and from the links pointing at them", async () => {
    const { beta, exp } = await seed();
    await setLifecycle("projects", beta.id, "archive");
    expect((await getExperienceBySlug(exp.slug, "en"))?.projects.map((p) => p.title)).toEqual(["Alpha"]);
    expect(await getProjectBySlug(beta.slug, "en")).toBeNull();
    await setLifecycle("projects", beta.id, "unarchive");

    await setLifecycle("experience", exp.id, "trash");
    expect(await getExperienceBySlug(exp.slug, "en")).toBeNull();
    expect((await listItems("experience", "trash")).map((x) => x.id)).toEqual([exp.id]);
    await setLifecycle("experience", exp.id, "restore");
    expect(await getExperienceBySlug(exp.slug, "en")).not.toBeNull();
  });
});
