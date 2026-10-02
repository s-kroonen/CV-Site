"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";

// Shown for unknown pages (and unknown projects/experience/education) inside a language.
export default function NotFound() {
  const { t, href } = useLocale();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="font-mono text-sm tracking-widest text-accent">404</p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium">{t.common.notFoundTitle}</h1>
      <p className="max-w-md text-ink-muted">{t.common.notFoundText}</p>
      <Link href={href("/")} className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90">
        {t.common.backHome}
      </Link>
    </div>
  );
}
