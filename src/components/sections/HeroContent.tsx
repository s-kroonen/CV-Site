"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SocialLink } from "@/lib/json";
import { useLocale } from "@/components/i18n/LocaleProvider";

const pill =
  "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent";

/** Profile header: photo, name, headline, location and the main ways to reach or follow you. */
export function HeroContent({
  avatarPath,
  name,
  tagline,
  location,
  publicEmail,
  links,
}: {
  avatarPath?: string | null;
  name: string;
  tagline: string;
  location: string;
  publicEmail: string;
  links: SocialLink[];
}) {
  const reduceMotion = useReducedMotion();
  const { lang, t } = useLocale();
  // Slide up only (never start at opacity 0): the header is the first thing on screen, so it
  // must be visible immediately for visitors, crawlers and the largest-contentful-paint metric.
  const item = (delay: number) => ({
    initial: reduceMotion ? undefined : { y: 14 },
    animate: reduceMotion ? undefined : { y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
      {avatarPath && (
        <motion.div {...item(0)} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarPath}
            alt={name}
            width={144}
            height={144}
            fetchPriority="high"
            className="h-28 w-28 rounded-full object-cover ring-2 ring-accent/40 ring-offset-4 ring-offset-[var(--paper)] sm:h-36 sm:w-36"
          />
        </motion.div>
      )}

      <div className="flex min-w-0 flex-col gap-3">
        {location && (
          <motion.p {...item(0)} className="flex items-center gap-1.5 font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className="sr-only">{t.common.location}: </span>
            {location}
          </motion.p>
        )}
        <motion.h1
          {...item(0.06)}
          className="font-[family-name:var(--font-display)] text-5xl leading-[0.98] font-medium tracking-tight sm:text-6xl"
        >
          {name}
        </motion.h1>
        {tagline && (
          <motion.p {...item(0.12)} className="max-w-xl text-lg text-ink-muted">
            {tagline}
          </motion.p>
        )}

        <motion.div {...item(0.18)} className="mt-2 flex flex-wrap items-center gap-3">
          <a
            href={`/api/cv?lang=${lang}`}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
            </svg>
            {t.common.downloadCv}
          </a>
          {publicEmail && (
            <a href={`mailto:${publicEmail}`} className={pill}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <span className="sr-only">{t.common.emailMe}: </span>
              {publicEmail}
            </a>
          )}
          {links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer me" className={pill}>
              {link.label}
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
