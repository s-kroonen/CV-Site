import { formatDateRange } from "@/lib/format";
import type { EducationModel as Education } from "@/generated/prisma/models";
import { SectionHeading } from "@/components/site/SectionHeading";
import { FadeInView } from "@/components/motion/FadeInView";

export function EducationSection({
  items: allItems,
  asPage = false,
  limit,
  moreHref,
}: {
  items: Education[];
  asPage?: boolean;
  limit?: number;
  moreHref?: string;
}) {
  if (allItems.length === 0) return null;
  const items = limit ? allItems.slice(0, limit) : allItems;
  const hasMore = allItems.length > items.length;

  return (
    <FadeInView>
      <section id="education" className="flex flex-col gap-6 py-16">
        <SectionHeading title="Education" asPage={asPage} moreHref={hasMore ? moreHref : undefined} />
        <ul className="flex flex-col gap-6">
          {items.map((item) => (
            <li key={item.id}>
              {formatDateRange(item.startDate, item.endDate) && (
                <p className="font-mono text-xs text-ink-muted uppercase tracking-wide">
                  {formatDateRange(item.startDate, item.endDate)}
                </p>
              )}
              <h3 className="mt-1 flex items-center gap-2 text-lg font-medium">
                {item.logoPath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.logoPath} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded object-contain" />
                )}
                {item.degree || item.institution}
              </h3>
              {(item.degree ? item.institution : "") || item.field ? (
                <p className="text-ink-muted">{[item.degree ? item.institution : "", item.field].filter(Boolean).join(" · ")}</p>
              ) : null}
              {item.description && <p className="mt-1 max-w-2xl text-ink-muted">{item.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    </FadeInView>
  );
}
