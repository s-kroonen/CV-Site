import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createItem, getItem, setItemTranslation, updateItem, updateProfile } from "@/lib/content-service";
import { getExperience, getProfile } from "@/lib/data";
import { localizeRows } from "@/lib/translations";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db";

type Created = { id: string; translationStatus: { status: string; message?: string }; translations: Record<string, Record<string, unknown>> };

let providerCalls = 0;
/** Fake LibreTranslate: tags every text with the target language. */
function useProvider() {
  process.env.LIBRETRANSLATE_URL = "http://fake-translate";
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    providerCalls++;
    const body = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ translatedText: body.q.map((t: string) => `[${body.target}] ${t}`) }), { status: 200 });
  });
}

beforeEach(async () => {
  providerCalls = 0;
  delete process.env.LIBRETRANSLATE_URL;
  delete process.env.DEEPL_API_KEY;
  await resetDb();
});
afterEach(() => vi.unstubAllGlobals());

describe("without a translation service", () => {
  it("falls back to the source text in the other language", async () => {
    const e = (await createItem("experience", { title: "Engineer", company: "Acme" })) as Created;
    expect(e.translationStatus.status).toBe("none");
    expect((await getExperience("nl"))[0].title).toBe("Engineer");
  });

  it("uses a hand-written translation and keeps the source language view unchanged", async () => {
    const e = (await createItem("experience", {
      title: "Developer",
      company: "Beta",
      translation: { title: "Ontwikkelaar", bullets: ["een", "twee"] },
    })) as Created;
    expect(e.translationStatus.status).toBe("saved-manual");
    const nl = (await getExperience("nl"))[0];
    expect(nl).toMatchObject({ title: "Ontwikkelaar", company: "Beta", bullets: ["een", "twee"] });
    expect((await getExperience("en"))[0].title).toBe("Developer");
  });

  it("supports Dutch as the source language with an English translation", async () => {
    const s = (await createItem("skills", { name: "Rust", category: "Talen", sourceLang: "nl", translation: { category: "Languages" } })) as Created;
    const row = await prisma.skill.findUniqueOrThrow({ where: { id: s.id } });
    expect((await localizeRows("skills", [row], "en"))[0].category).toBe("Languages");
    expect((await localizeRows("skills", [row], "nl"))[0].category).toBe("Talen");
  });

  it("set_translation writes by hand and refuses the source language", async () => {
    const s = (await createItem("skills", { name: "Go", category: "Languages" })) as Created;
    await setItemTranslation("skills", s.id, { category: "Talen" });
    expect(((await getItem("skills", s.id)) as Created).translations.nl.category).toBe("Talen");
    await expect(setItemTranslation("skills", s.id, { category: "x" }, "en")).rejects.toThrow(/written in en/);
  });

  it("translates the profile too", async () => {
    await prisma.profile.create({ data: { id: 1, name: "Test", tagline: "", bio: "", publicEmail: "", location: "", socialLinks: [] } });
    await updateProfile({ tagline: "Software engineer", translation: { tagline: "Software-engineer" } });
    expect((await getProfile("nl"))?.tagline).toBe("Software-engineer");
    expect((await getProfile("en"))?.tagline).toBe("Software engineer");
  });
});

describe("with a translation service", () => {
  it("translates automatically on create and refreshes on update", async () => {
    useProvider();
    const e = (await createItem("experience", { title: "Tester", company: "Gamma", description: "Tested", bullets: ["x"] })) as Created;
    expect(e.translationStatus.status).toBe("auto-translated");
    expect((await getExperience("nl"))[0]).toMatchObject({ title: "[nl] Tester", description: "[nl] Tested", bullets: ["[nl] x"] });

    const u = (await updateItem("experience", e.id, { description: "Tested more" })) as Created;
    expect(u.translations.nl.description).toBe("[nl] Tested more");
    expect(providerCalls).toBe(2);
  });

  it("never overwrites a hand-written translation, but flags it as out of date", async () => {
    useProvider();
    const e = (await createItem("experience", { title: "Dev", company: "Co", description: "Wrote", translation: { description: "Schreef" } })) as Created;
    providerCalls = 0;
    const u = (await updateItem("experience", e.id, { description: "Wrote lots" })) as Created;
    expect(u.translationStatus.status).toBe("kept-manual");
    expect(u.translations.nl).toMatchObject({ description: "Schreef", _manual: true, _stale: true });
    expect(providerCalls).toBe(0);
  });

  it("still saves the item when the service fails (quota)", async () => {
    process.env.DEEPL_API_KEY = "k";
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 456 }));
    const e = (await createItem("experience", { title: "Fail", company: "Delta" })) as Created;
    expect(e.id).toBeTruthy();
    expect(e.translationStatus).toMatchObject({ status: "failed" });
    expect(e.translationStatus.message).toMatch(/quota/);
  });
});
