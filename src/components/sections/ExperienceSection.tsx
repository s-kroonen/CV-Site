"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { formatDateRange } from "@/lib/format";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { ExperienceModel as Experience } from "@/generated/prisma/models";
import { SectionHeading } from "@/components/site/SectionHeading";
import { FadeInView } from "@/components/motion/FadeInView";

/**
 * Compact experience timeline: title, company, dates, a short description and a few
 * tags. Bullet points and linked projects live on the detail page the card links to.
 */
export function ExperienceSection({
  items: allItems,
  asPage = false,
  limit,
  moreHref,
}: {
  items: Experience[];
  asPage?: boolean;
  limit?: number;
  moreHref?: string;
}) {
  const reduceMotion = useReducedMotion();
  const { lang, t, href } = useLocale();
  if (allItems.length === 0) return null;
  const items = limit ? allItems.slice(0, limit) : allItems;
  const hasMore = allItems.length > items.length;

  return (
    <FadeInView>
      <section id="experience" className="flex flex-col gap-8 py-16">
        <SectionHeading title={t.sections.experience} asPage={asPage} moreHref={hasMore ? moreHref : undefined} moreLabel={t.common.viewAll} />
        <ol className="relative flex flex-col gap-6 pl-6">
          <motion.div
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-0 w-px origin-top bg-line"
            initial={reduceMotion ? undefined : { scaleY: 0 }}
            whileInView={reduceMotion ? undefined : { scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
          {items.map((item, index) => {
            const projects = ((item as { projects?: { title: string; slug: string }[] }).projects ?? []).slice(0, 3);
            const dateRange = formatDateRange(item.startDate, item.endDate, lang, t.common);
            const target = item.slug ? href(`/experience/${item.slug}`) : href("/experience");
            return (
              <motion.li
                key={item.id}
                className="relative"
                initial={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.4) }}
              >
                <span className="absolute top-6 -left-[1.65rem] h-2.5 w-2.5 rounded-full bg-accent" />
                <Link
                  href={target}
                  className="group block rounded-lg border border-transparent p-4 transition-colors hover:border-line hover:bg-paper/60"
                >
                  {dateRange && <p className="font-mono text-xs text-ink-muted uppercase tracking-wide">{dateRange}</p>}
                  <h3 className="mt-1 flex items-center gap-2 text-lg font-medium">
                    {item.logoPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logoPath} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded object-contain" />
                    )}
                    <span>
                      {item.title}
                      {item.title && item.company && <span className="text-ink-muted"> · </span>}
                      <span className={item.title ? "text-ink-muted" : ""}>{item.company}</span>
                    </span>
                  </h3>
                  {item.location && <p className="text-sm text-ink-muted">{item.location}</p>}
                  {item.description && <p className="mt-2 line-clamp-3 max-w-2xl text-ink-muted">{item.description}</p>}
                  {projects.length > 0 && (
                    <p className="mt-3 text-sm text-ink-muted">
                      <span className="font-medium text-ink">{t.detail.projects}:</span>{" "}
                      {projects.map((p) => p.title).join(" · ")}
                    </p>
                  )}
                  <span className="mt-3 inline-block text-sm text-accent underline decoration-accent/40 underline-offset-4 group-hover:decoration-accent">
                    {t.detail.readMore}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      </section>
    </FadeInView>
  );
}
