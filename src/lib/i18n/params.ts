import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";

/** Reads the [lang] route segment; anything that is not a supported language is a 404. */
export async function resolveLang(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}
