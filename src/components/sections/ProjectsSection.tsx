"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { asStringArray } from "@/lib/json";
import type { ProjectModel as Project } from "@/generated/prisma/models";
import { FadeInView } from "@/components/motion/FadeInView";

export function ProjectsSection({ items }: { items: Project[] }) {
  const reduceMotion = useReducedMotion();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const project of items) {
      for (const tag of asStringArray(project.techStack)) set.add(tag);
    }
    return [...set].sort();
  }, [items]);

  const filtered = activeTag
    ? items.filter((project) => asStringArray(project.techStack).includes(activeTag))
    : items;

  if (items.length === 0) return null;

  return (
    <FadeInView>
      <section id="projects" className="flex flex-col gap-8 py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">Projects</h2>
          {allTags.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                  activeTag === null ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-muted"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                    activeTag === tag ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-muted"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.div layout={!reduceMotion} className="grid gap-6 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((project) => {
              const tech = asStringArray(project.techStack);
              return (
                <motion.div
                  key={project.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                  animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link
                    href={`/projects/${project.slug}`}
                    className="flex h-full flex-col gap-2 rounded-lg border border-line p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <h3 className="text-lg font-medium">{project.title}</h3>
                    <p className="text-ink-muted">{project.summary}</p>
                    {tech.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tech.map((t) => (
                          <span key={t} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </section>
    </FadeInView>
  );
}
