"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { asImages, asStringArray } from "@/lib/json";
import { formatProjectPeriod } from "@/lib/format";
import type { ProjectModel as Project } from "@/generated/prisma/models";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StatusBadge } from "@/components/site/StatusBadge";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { FadeInView } from "@/components/motion/FadeInView";

/**
 * Projects overview. On the Projects tab the cards are grouped by category (groups in order of their
 * first project; projects without a category come last); the Overview shows a flat teaser list.
 */
export function ProjectsSection({
  items: allItems,
  asPage = false,
  limit,
  moreHref,
}: {
  items: Project[];
  asPage?: boolean;
  limit?: number;
  moreHref?: string;
}) {
  const items = limit ? allItems.slice(0, limit) : allItems;
  const hasMore = allItems.length > items.length;
  const reduceMotion = useReducedMotion();
  const { lang, t, href } = useLocale();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const project of items) {
      for (const tag of asStringArray(project.techStack)) set.add(tag);
    }
    return [...set].sort();
  }, [items]);

  const filtered = activeTag ? items.filter((project) => asStringArray(project.techStack).includes(activeTag)) : items;

  const groups = useMemo(() => {
    const order: string[] = [];
    const byCategory = new Map<string, Project[]>();
    for (const p of filtered) {
      const key = p.category || "";
      if (!byCategory.has(key)) {
        byCategory.set(key, []);
        order.push(key);
      }
      byCategory.get(key)!.push(p);
    }
    // Uncategorised projects last; if nothing has a category there is a single unnamed group.
    const named = order.filter((k) => k !== "");
    return [...named, ...(byCategory.has("") ? [""] : [])].map((key) => ({ key, projects: byCategory.get(key)! }));
  }, [filtered]);
  const grouped = !limit && groups.some((g) => g.key !== "");

  if (items.length === 0) return null;

  const renderCard = (project: Project) => {
    const tech = asStringArray(project.techStack);
    const cover = asImages(project.images)[0];
    const period = formatProjectPeriod(project.startDate, project.endDate, project.status, lang, t.common.present);
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
          href={href(`/projects/${project.slug}`)}
          className="flex h-full flex-col gap-2 rounded-lg border border-line p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.thumb ?? cover.src}
              alt={cover.alt || project.title}
              loading="lazy"
              className="mb-2 aspect-video w-full rounded-md object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium">{project.title}</h3>
            <StatusBadge status={project.status} labels={t.status} />
          </div>
          {period && <p className="font-mono text-xs text-ink-muted">{period}</p>}
          {project.summary && <p className="text-ink-muted">{project.summary}</p>}
          {tech.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tech.map((tag) => (
                <span key={tag} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Link>
      </motion.div>
    );
  };

  return (
    <FadeInView>
      <section id="projects" className="flex flex-col gap-8 py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading title={t.sections.projects} asPage={asPage} moreHref={hasMore ? moreHref : undefined} moreLabel={t.common.viewAll} />
          {!limit && allTags.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                  activeTag === null ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-muted"
                }`}
              >
                {t.common.all}
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

        {grouped ? (
          groups.map((group) => (
            <div key={group.key || "other"} className="flex flex-col gap-4">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium">{group.key || t.status.other}</h2>
              <motion.div layout={!reduceMotion} className="grid gap-6 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">{group.projects.map(renderCard)}</AnimatePresence>
              </motion.div>
            </div>
          ))
        ) : (
          <motion.div layout={!reduceMotion} className="grid gap-6 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">{filtered.map(renderCard)}</AnimatePresence>
          </motion.div>
        )}
      </section>
    </FadeInView>
  );
}
