import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { EducationModel as Education } from "@/generated/prisma/models";
import { SectionHeading } from "@/components/site/SectionHeading";
import { FadeInView } from "@/components/motion/FadeInView";

/** Compact education list; each entry links to its detail page (linked experience and projects). */
export function EducationSection({
  lang,
  items: allItems,
  asPage = false,
  limit,
  moreHref,
}: {
  lang: Locale;
  items: Education[];
  asPage?: boolean;
  limit?: number;
  moreHref?: string;
}) {
  if (allItems.length === 0) return null;
  const t = getDictionary(lang);
  const items = limit ? allItems.slice(0, limit) : allItems;
  const hasMore = allItems.length > items.length;

  return (
    <FadeInView>
      <section id="education" className="flex flex-col gap-6 py-16">
        <SectionHeading title={t.sections.education} asPage={asPage} moreHref={hasMore ? moreHref : undefined} moreLabel={t.common.viewAll} />
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const dates = formatDateRange(item.startDate, item.endDate, lang, t.common);
            const sub = [item.degree ? item.institution : "", item.field].filter(Boolean).join(" · ");
            const target = localizedPath(lang, item.slug ? `/education/${item.slug}` : "/education");
            return (
              <li key={item.id}>
                <Link href={target} className="group block rounded-lg border border-transparent p-4 transition-colors hover:border-line hover:bg-paper/60">
                  {dates && <p className="font-mono text-xs text-ink-muted uppercase tracking-wide">{dates}</p>}
                  <h3 className="mt-1 flex items-center gap-2 text-lg font-medium">
                    {item.logoPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logoPath} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded object-contain" />
                    )}
                    {item.degree || item.institution}
                  </h3>
                  {sub && <p className="text-ink-muted">{sub}</p>}
                  {item.description && <p className="mt-1 line-clamp-2 max-w-2xl text-ink-muted">{item.description}</p>}
                  <span className="mt-2 inline-block text-sm text-accent underline decoration-accent/40 underline-offset-4 group-hover:decoration-accent">
                    {t.detail.readMore}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </FadeInView>
  );
}
