"use client";

import { motion, useReducedMotion } from "framer-motion";
import { asStringArray } from "@/lib/json";
import { formatDateRange } from "@/lib/format";
import type { ExperienceModel as Experience } from "@/generated/prisma/models";
import { FadeInView } from "@/components/motion/FadeInView";

export function ExperienceSection({ items }: { items: Experience[] }) {
  const reduceMotion = useReducedMotion();
  if (items.length === 0) return null;

  return (
    <FadeInView>
      <section id="experience" className="flex flex-col gap-8 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">Experience</h2>
        <ol className="relative flex flex-col gap-10 pl-6">
          <motion.div
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-0 w-px origin-top bg-line"
            initial={reduceMotion ? undefined : { scaleY: 0 }}
            whileInView={reduceMotion ? undefined : { scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
          {items.map((item, index) => {
            const bullets = asStringArray(item.bullets);
            const tags = asStringArray(item.tags);
            return (
              <motion.li
                key={item.id}
                className="relative"
                initial={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.4) }}
              >
                <span className="absolute top-1.5 -left-[1.65rem] h-2.5 w-2.5 rounded-full bg-accent" />
                <p className="font-mono text-xs text-ink-muted uppercase tracking-wide">
                  {formatDateRange(item.startDate, item.endDate)}
                </p>
                <h3 className="mt-1 text-lg font-medium">
                  {item.title} <span className="text-ink-muted">· {item.company}</span>
                </h3>
                {item.location && <p className="text-sm text-ink-muted">{item.location}</p>}
                <p className="mt-2 max-w-2xl text-ink-muted">{item.description}</p>
                {bullets.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-ink-muted">
                    {bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.li>
            );
          })}
        </ol>
      </section>
    </FadeInView>
  );
}
