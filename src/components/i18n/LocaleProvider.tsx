"use client";

import { createContext, useContext, type ReactNode } from "react";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { fmt, type Dictionary } from "@/lib/i18n/dictionary";

type Ctx = { lang: Locale; t: Dictionary };
const LocaleContext = createContext<Ctx | null>(null);

/** Makes the current language and its interface text available to client components. */
export function LocaleProvider({ lang, dictionary, children }: { lang: Locale; dictionary: Dictionary; children: ReactNode }) {
  return <LocaleContext.Provider value={{ lang, t: dictionary }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return {
    lang: ctx.lang,
    t: ctx.t,
    /** Site path in the current language: href("/projects") -> "/nl/projects". */
    href: (path: string) => localizedPath(ctx.lang, path),
    fmt,
  };
}
