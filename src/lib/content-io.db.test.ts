import { strToU8 } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { applyImport, buildExport, parseImportFile, planImport, prepareImport } from "@/lib/content-io";
import { createItem, setLifecycle } from "@/lib/content-service";
import { getExperienceBySlug } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db";

beforeEach(resetDb);

const importDoc = (doc: unknown) => {
  const parsed = parseImportFile(strToU8(JSON.stringify(doc)), "x.json");
  return { parsed, prepared: prepareImport(parsed.doc, parsed.uploads) };
};

async function seed() {
  const p = (await createItem("projects", { title: "Proj", summary: "s" })) as { id: string; slug: string };
  const edu = (await createItem("education", { institution: "Uni", degree: "BSc" })) as { id: string };
  const exp = (await createItem("experience", {
    title: "Intern",
    company: "Co",
    projectIds: [p.id],
    educationIds: [edu.id],
    translation: { title: "Stagiair" },
  })) as { id: string; slug: string };
  const skill = (await createItem("skills", { name: "Rust", category: "Talen", sourceLang: "nl", translation: { category: "Languages" } })) as { id: string };
  await setLifecycle("skills", skill.id, "archive");
  return { p, edu, exp, skill };
}

describe("export / import", () => {
  it("round-trips content, lifecycle, links, languages and translations (replace mode)", async () => {
    const { exp } = await seed();
    const doc = await buildExport(false);
    expect(doc.privateContact).toBeNull();
    const { parsed, prepared } = importDoc(doc);
    expect(prepared.errors).toEqual([]);

    await applyImport(prepared, parsed.uploads, "replace", false);

    const e = await getExperienceBySlug(exp.slug, "nl");
    expect(e).toMatchObject({ title: "Stagiair" });
    expect(e?.projects.map((x) => x.title)).toEqual(["Proj"]);
    expect(e?.education.map((x) => x.degree)).toEqual(["BSc"]);
    const rust = await prisma.skill.findFirstOrThrow({ where: { name: "Rust" } });
    expect(rust).toMatchObject({ sourceLang: "nl", archivedAt: expect.any(Date) });
    expect(await prisma.translation.count()).toBe(2);
  });

  it("add mode skips what already exists", async () => {
    await seed();
    const { parsed, prepared } = importDoc(await buildExport(false));
    const { summary } = await planImport(prepared, "add", false);
    expect(summary.experience).toMatchObject({ total: 1, create: 0, skip: 1 });
    await applyImport(prepared, parsed.uploads, "add", false);
    expect(await prisma.experience.count()).toBe(1);
  });

  it("can leave out the private contact details", async () => {
    await prisma.privateContact.create({ data: { id: 1, email: "secret@example.com", phone: "123" } });
    expect(JSON.stringify(await buildExport(false))).not.toContain("secret@example.com");
    expect(JSON.stringify(await buildExport(true))).toContain("secret@example.com");
  });

  it("reports every invalid record and refuses nothing silently", () => {
    const { prepared } = importDoc({
      version: 1,
      experience: [{ title: "", company: "" }],
      projects: [{ title: "A", slug: "Bad Slug" }, { title: "B" }, { title: "B" }],
    });
    expect(prepared.errors).toHaveLength(3);
    expect(prepared.errors.join("\n")).toMatch(/title or a company/);
    expect(prepared.errors.join("\n")).toMatch(/duplicate slug "b"/);
  });

  it("rejects files that are not exports", () => {
    expect(() => parseImportFile(strToU8("nope"), "x.json")).toThrow();
    expect(importDoc("a string").prepared.errors.length).toBeGreaterThan(0);
    expect(importDoc({ version: 99 }).prepared.errors.join()).toMatch(/newer/);
  });
});
