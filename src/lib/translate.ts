import type { Locale } from "@/lib/i18n/config";

// Machine translation through a translation API (deliberately not an LLM).
// Configure one provider with environment variables; with none configured the
// site works exactly the same, translations are then written by hand (or via MCP).
//
//   DeepL (free tier: 500k characters/month):  DEEPL_API_KEY=...
//   LibreTranslate (self-hosted, no key/cost): LIBRETRANSLATE_URL=http://libretranslate:5000
//                                              LIBRETRANSLATE_API_KEY=... (only if the server requires one)

export type Provider = "deepl" | "libretranslate";

export function translationProvider(): Provider | null {
  if (process.env.DEEPL_API_KEY) return "deepl";
  if (process.env.LIBRETRANSLATE_URL) return "libretranslate";
  return null;
}

export class TranslateError extends Error {}

const TIMEOUT_MS = 20_000;

async function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new TranslateError("The translation service could not be reached.");
  }
  if (!res.ok) {
    const hint = res.status === 403 || res.status === 401 ? " (check the API key)" : res.status === 456 ? " (quota exceeded)" : "";
    throw new TranslateError(`The translation service returned HTTP ${res.status}${hint}.`);
  }
  return res.json().catch(() => {
    throw new TranslateError("The translation service sent an unreadable answer.");
  });
}

async function deepl(texts: string[], from: Locale, to: Locale): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY!;
  // Free-tier keys end in ":fx" and use a different host.
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const data = (await postJson(
    `${host}/v2/translate`,
    { text: texts, source_lang: from.toUpperCase(), target_lang: to === "en" ? "EN-GB" : to.toUpperCase() },
    { Authorization: `DeepL-Auth-Key ${key}` },
  )) as { translations?: { text: string }[] };
  if (!data.translations || data.translations.length !== texts.length) throw new TranslateError("Unexpected answer from DeepL.");
  return data.translations.map((t) => t.text);
}

async function libretranslate(texts: string[], from: Locale, to: Locale): Promise<string[]> {
  const base = process.env.LIBRETRANSLATE_URL!.replace(/\/+$/, "");
  const data = (await postJson(
    `${base}/translate`,
    { q: texts, source: from, target: to, format: "text", ...(process.env.LIBRETRANSLATE_API_KEY ? { api_key: process.env.LIBRETRANSLATE_API_KEY } : {}) },
    {},
  )) as { translatedText?: string[] | string };
  const out = Array.isArray(data.translatedText) ? data.translatedText : data.translatedText ? [data.translatedText] : [];
  if (out.length !== texts.length) throw new TranslateError("Unexpected answer from LibreTranslate.");
  return out;
}

/** Translates each text; empty strings are passed through untouched (and cost nothing). */
export async function translateTexts(texts: string[], from: Locale, to: Locale): Promise<string[]> {
  const provider = translationProvider();
  if (!provider) throw new TranslateError("No translation service is configured.");
  if (from === to) return texts;

  const idx = texts.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return texts;
  const translated = await (provider === "deepl" ? deepl : libretranslate)(idx.map((i) => texts[i]), from, to);
  const out = [...texts];
  idx.forEach((i, k) => (out[i] = translated[k]));
  return out;
}
