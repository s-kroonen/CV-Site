"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { asImages, asStringArray } from "@/lib/json";
import { formatProjectPeriod } from "@/lib/format";
import { filterProjects, statusCounts } from "@/lib/project-filter";
import type { ProjectModel as Project } from "@/generated/prisma/models";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StatusBadge } from "@/components/site/StatusBadge";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { FadeInView } from "@/components/motion/FadeInView";

const KIND_ORDER = ["all", "personal", "education", "work"] as const;

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
    active ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-muted hover:text-ink"
  }`;

/**
 * Projects overview. The Overview page shows a short flat list. The Projects page adds sub-tabs (personal /
 * education / work), a search box, a status filter and category groups that start folded, so the page is a
 * short list of headings instead of every project at once.
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
  const reduceMotion = useReducedMotion();
  const { lang, t, href } = useLocale();
  const searchId = useId();
  const [kind, setKind] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [allOpen, setAllOpen] = useState(false);

  const interactive = !limit;
  const kindTabs = KIND_ORDER.filter((k) => k === "all" || allItems.some((p) => p.kind === k));
  const kindItems = interactive && kind !== "all" ? allItems.filter((p) => p.kind === kind) : allItems;

  const statusLabels = t.status as Record<string, string>;
  const searched = useMemo(() => filterProjects(kindItems, { query, status: "", labels: statusLabels }), [kindItems, query, statusLabels]);
  const chips = useMemo(() => statusCounts(searched), [searched]);
  const allTags = useMemo(() => [...new Set(searched.flatMap((p) => asStringArray(p.techStack)))].sort(), [searched]);

  const filtered = useMemo(() => {
    const byStatus = status ? searched.filter((p) => p.status === status) : searched;
    return activeTag ? byStatus.filter((p) => asStringArray(p.techStack).includes(activeTag)) : byStatus;
  }, [searched, status, activeTag]);

  const shown = limit ? filtered.slice(0, limit) : filtered;
  const hasMore = allItems.length > shown.length && !!limit;

  const groups = useMemo(() => {
    const order: string[] = [];
    const byCategory = new Map<string, Project[]>();
    for (const p of shown) {
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
  }, [shown]);

  if (allItems.length === 0) return null;

  const grouped = interactive && groups.some((g) => g.key !== "");
  const filtering = query.trim() !== "" || status !== "" || activeTag !== null;
  // Groups start folded; searching or filtering unfolds everything that matches.
  const isOpen = (key: string) => !grouped || filtering || allOpen || opened.has(key);
  const toggle = (key: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const countLabel = (n: number) => (n === 1 ? t.projectsPage.countOne : t.projectsPage.count.replace("{n}", String(n)));

  const renderCard = (project: Project) => {
    const tags = showTags && interactive ? asStringArray(project.techStack) : [];
    const cover = !interactive ? asImages(project.images)[0] : undefined;
    const period = formatProjectPeriod(project.startDate, project.endDate, project.status, lang, t.common.present);
    return (
      <motion.div
        key={project.id}
        initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          href={href(`/projects/${project.slug}`)}
          className="flex h-full flex-col gap-1.5 rounded-lg border border-line p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.thumb ?? cover.src} alt={cover.alt || project.title} loading="lazy" className="mb-1 aspect-video w-full rounded-md object-cover" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium">{project.title}</h3>
            <StatusBadge status={project.status} labels={t.status} />
          </div>
          {period && <p className="font-mono text-xs text-ink-muted">{period}</p>}
          {project.summary && <p className="line-clamp-2 text-sm text-ink-muted">{project.summary}</p>}
          {tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Link>
      </motion.div>
    );
  };

  const cards = (list: Project[]) => <div className="grid gap-4 sm:grid-cols-2">{list.map(renderCard)}</div>;

  return (
    <FadeInView>
      <section id="projects" className="flex flex-col gap-6 py-16">
        <SectionHeading title={t.sections.projects} asPage={asPage} moreHref={hasMore ? moreHref : undefined} moreLabel={t.common.viewAll} />

        {interactive && kindTabs.length > 2 && (
          <div role="tablist" aria-label={t.sections.projects} className="flex flex-wrap gap-2">
            {kindTabs.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => {
                  setKind(k);
                  setActiveTag(null);
                  setStatus("");
                  setOpened(new Set());
                }}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  kind === k ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {t.kinds[k]}
                <span className="ml-1.5 font-mono text-xs opacity-70">{k === "all" ? allItems.length : allItems.filter((p) => p.kind === k).length}</span>
              </button>
            ))}
          </div>
        )}

        {interactive && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={searchId} className="sr-only">
                {t.projectsPage.searchLabel}
              </label>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.projectsPage.searchPlaceholder}
                className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setShowTags((v) => !v);
                  setActiveTag(null);
                }}
                aria-expanded={showTags}
                className={chip(false)}
              >
                {showTags ? t.common.hideTags : t.common.showTags}
              </button>
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.projectsPage.statusLabel}>
                <button type="button" onClick={() => setStatus("")} aria-pressed={status === ""} className={chip(status === "")}>
                  {t.projectsPage.allStatuses}
                  <span className="ml-1.5 opacity-70">{searched.length}</span>
                </button>
                {chips.map(({ status: s, count }) => (
                  <button key={s} type="button" onClick={() => setStatus(status === s ? "" : s)} aria-pressed={status === s} className={chip(status === s)}>
                    {statusLabels[s] ?? s}
                    <span className="ml-1.5 opacity-70">{count}</span>
                  </button>
                ))}
              </div>
            )}

            {showTags && allTags.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setActiveTag(null)} className={chip(activeTag === null)}>
                  {t.common.all}
                </button>
                {allTags.map((tag) => (
                  <button key={tag} type="button" onClick={() => setActiveTag(activeTag === tag ? null : tag)} className={chip(activeTag === tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 text-xs text-ink-muted" aria-live="polite">
              <span>{countLabel(shown.length)}</span>
              {grouped && groups.length > 1 && !filtering && (
                <button
                  type="button"
                  onClick={() => {
                    setAllOpen((v) => !v);
                    setOpened(new Set());
                  }}
                  className="underline decoration-line underline-offset-4 hover:text-ink"
                >
                  {allOpen ? t.projectsPage.collapseAll : t.projectsPage.expandAll}
                </button>
              )}
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-muted">{t.projectsPage.noResults}</p>
        ) : grouped ? (
          <div className="flex flex-col gap-3">
            {groups.map((group) => {
              const key = group.key || "other";
              const open = isOpen(key);
              const panelId = `${searchId}-${key.replace(/\W+/g, "-")}`;
              return (
                <div key={key} className="rounded-lg border border-line">
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="font-[family-name:var(--font-display)] text-xl font-medium">{group.key || t.status.other}</span>
                    <span className="flex items-center gap-3 text-sm text-ink-muted">
                      <span className="font-mono text-xs">{group.projects.length}</span>
                      <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </span>
                  </button>
                  <div id={panelId} hidden={!open} className="px-4 pb-4">
                    {open && cards(group.projects)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          cards(shown)
        )}
      </section>
    </FadeInView>
  );
}
