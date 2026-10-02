import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TranslateError, translateTexts, translationProvider } from "./translate";
import { autoTranslateFields, hashFields, parseProvided, pickFields, sanitizeFields } from "./translations";

const env = { ...process.env };
beforeEach(() => {
  delete process.env.DEEPL_API_KEY;
  delete process.env.LIBRETRANSLATE_URL;
  delete process.env.LIBRETRANSLATE_API_KEY;
});
afterEach(() => {
  process.env = { ...env };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mockFetch = (handler: (url: string, init: RequestInit) => unknown, status = 200) => {
  const fn = vi.fn(async (url: string, init: RequestInit) => new Response(JSON.stringify(handler(url, init)), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
};

describe("translation provider", () => {
  it("is off without configuration and refuses to translate", async () => {
    expect(translationProvider()).toBeNull();
    await expect(translateTexts(["hi"], "en", "nl")).rejects.toBeInstanceOf(TranslateError);
  });

  it("prefers DeepL, using the free host for :fx keys and sending codes DeepL expects", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    const fetchMock = mockFetch(() => ({ translations: [{ text: "hallo" }, { text: "wereld" }] }));
    const out = await translateTexts(["hello", "world"], "en", "nl");
    expect(out).toEqual(["hallo", "wereld"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api-free.deepl.com/v2/translate");
    expect((init.headers as Record<string, string>).Authorization).toBe("DeepL-Auth-Key abc:fx");
    expect(JSON.parse(String(init.body))).toMatchObject({ source_lang: "EN", target_lang: "NL" });
  });

  it("targets EN-GB when translating into English", async () => {
    process.env.DEEPL_API_KEY = "paidkey";
    const fetchMock = mockFetch(() => ({ translations: [{ text: "hello" }] }));
    await translateTexts(["hallo"], "nl", "en");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.deepl.com/v2/translate");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({ source_lang: "NL", target_lang: "EN-GB" });
  });

  it("supports LibreTranslate and does not send empty strings", async () => {
    process.env.LIBRETRANSLATE_URL = "http://libre:5000/";
    const fetchMock = mockFetch((_u, init) => ({ translatedText: JSON.parse(String(init.body)).q.map((t: string) => t.toUpperCase()) }));
    const out = await translateTexts(["a", "", "  ", "b"], "en", "nl");
    expect(out).toEqual(["A", "", "  ", "B"]);
    expect(fetchMock.mock.calls[0][0]).toBe("http://libre:5000/translate");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).q).toEqual(["a", "b"]);
  });

  it("turns HTTP failures into readable errors", async () => {
    process.env.DEEPL_API_KEY = "k";
    mockFetch(() => ({}), 403);
    await expect(translateTexts(["x"], "en", "nl")).rejects.toThrow(/API key/);
    mockFetch(() => ({}), 456);
    await expect(translateTexts(["x"], "en", "nl")).rejects.toThrow(/quota/);
  });

  it("rejects an answer with the wrong number of translations", async () => {
    process.env.DEEPL_API_KEY = "k";
    mockFetch(() => ({ translations: [{ text: "only one" }] }));
    await expect(translateTexts(["a", "b"], "en", "nl")).rejects.toBeInstanceOf(TranslateError);
  });
});

describe("field translation", () => {
  it("flattens text and bullet lists into one request and rebuilds them", async () => {
    process.env.LIBRETRANSLATE_URL = "http://libre";
    const fetchMock = mockFetch((_u, init) => ({ translatedText: JSON.parse(String(init.body)).q.map((t: string) => `NL:${t}`) }));
    const out = await autoTranslateFields(
      "experience",
      { title: "Engineer", location: "", description: "Built things", bullets: ["one", "two"] },
      "en",
      "nl",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ title: "NL:Engineer", location: "", description: "NL:Built things", bullets: ["NL:one", "NL:two"] });
  });
});

describe("translation helpers", () => {
  it("picks only translatable fields", () => {
    const fields = pickFields("experience", { title: "T", company: "C", bullets: ["a"], tags: ["x"], description: "D", location: null });
    expect(fields).toEqual({ title: "T", location: "", description: "D", bullets: ["a"] });
  });

  it("sanitizes untrusted input to known fields and types", () => {
    const clean = sanitizeFields("projects", { summary: "  s  ", description: 5, evil: "<script>", __proto__: { x: 1 } });
    expect(clean).toEqual({ summary: "s", description: "" });
    expect(sanitizeFields("experience", { bullets: "a\n\n b " }).bullets).toEqual(["a", "b"]);
  });

  it("detects changed source text via the hash", () => {
    const a = hashFields({ title: "x", bullets: ["1"] });
    expect(hashFields({ title: "x", bullets: ["1"] })).toBe(a);
    expect(hashFields({ title: "x", bullets: ["2"] })).not.toBe(a);
  });

  it("parses a provided translation from the admin form or from MCP", () => {
    expect(parseProvided("skills", { fields: { category: "Talen" }, manual: false })).toEqual({ fields: { category: "Talen" }, manual: false });
    expect(parseProvided("skills", { category: "Talen" })).toEqual({ fields: { category: "Talen" }, manual: true });
    expect(parseProvided("skills", { fields: { category: "" } })).toBeNull();
    expect(parseProvided("skills", null)).toBeNull();
  });
});
