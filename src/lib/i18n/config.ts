// Supported site languages. The first one is the default / fallback.
export const LOCALES = ["en", "nl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export const isLocale = (v: unknown): v is Locale => (LOCALES as readonly string[]).includes(v as string);

/** Language names shown in the language switcher (each in its own language). */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", nl: "Nederlands" };

/** BCP 47 / Open Graph locale tags. */
export const OG_LOCALES: Record<Locale, string> = { en: "en_US", nl: "nl_NL" };

/** The other language (there are exactly two). */
export const otherLocale = (l: Locale): Locale => (l === "en" ? "nl" : "en");

/**
 * Picks the best supported language from an Accept-Language header
 * ("nl-NL,nl;q=0.9,en;q=0.8"): highest q-value whose primary tag we support.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { primary: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((x) => x.primary && !Number.isNaN(x.q) && x.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.find((x) => isLocale(x.primary))?.primary as Locale | undefined ?? DEFAULT_LOCALE;
}

/** Prefixes a site path with the language: ("nl", "/projects") -> "/nl/projects"; ("en", "/") -> "/en". */
export function localizedPath(lang: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${lang}` : `/${lang}${clean}`;
}

/** Splits "/nl/projects/x" into { lang: "nl", rest: "/projects/x" }; lang is null when there is no prefix. */
export function splitLocale(pathname: string): { lang: Locale | null; rest: string } {
  const [, first, ...tail] = pathname.split("/");
  if (isLocale(first)) return { lang: first, rest: "/" + tail.join("/") };
  return { lang: null, rest: pathname };
}
