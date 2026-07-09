"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SocialLink } from "@/lib/json";

export function HeroContent({
  name,
  tagline,
  location,
  publicEmail,
  links,
}: {
  name: string;
  tagline: string;
  location: string;
  publicEmail: string;
  links: SocialLink[];
}) {
  const reduceMotion = useReducedMotion();
  const item = (delay: number) => ({
    initial: reduceMotion ? undefined : { opacity: 0, y: 18 },
    animate: reduceMotion ? undefined : { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="relative flex flex-col gap-4">
      <motion.p {...item(0)} className="font-mono text-xs tracking-[0.2em] text-ink-muted uppercase">
        {location}
      </motion.p>
      <motion.h1
        {...item(0.08)}
        className="font-[family-name:var(--font-display)] text-6xl leading-[0.95] font-medium tracking-tight sm:text-7xl"
      >
        {name}
      </motion.h1>
      <motion.p {...item(0.16)} className="max-w-xl text-lg text-ink-muted">
        {tagline}
      </motion.p>
      <motion.div {...item(0.24)} className="mt-4 flex flex-wrap items-center gap-5 text-sm">
        <a href={`mailto:${publicEmail}`} className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
          {publicEmail}
        </a>
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
          >
            {link.label}
          </a>
        ))}
      </motion.div>
      <motion.div {...item(0.32)}>
        <a
          href="/api/cv"
          className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
        >
          Download CV (PDF)
        </a>
      </motion.div>
    </div>
  );
}
