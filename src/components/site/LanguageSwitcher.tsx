"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_NAMES, localizedPath, splitLocale, type Locale } from "@/lib/i18n/config";

/**
 * Switches the page to the same path in the other language. Plain links (so crawlers
 * and visitors without JavaScript can follow them); visiting a language URL also
 * remembers the choice (see proxy.ts).
 */
export function LanguageSwitcher({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  const { rest } = splitLocale(pathname);

  return (
    <nav aria-label={label} className="flex shrink-0 items-center text-xs">
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden="true" className="px-1 text-ink-muted">/</span>}
          <Link
            href={localizedPath(l, rest)}
            hrefLang={l}
            lang={l}
            aria-current={l === lang ? "true" : undefined}
            title={LOCALE_NAMES[l]}
            className={`rounded px-1 py-1 uppercase transition-colors ${
              l === lang ? "font-semibold text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {l}
          </Link>
        </span>
      ))}
    </nav>
  );
}
