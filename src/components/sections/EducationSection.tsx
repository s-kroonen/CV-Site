import { formatDateRange } from "@/lib/format";
import type { EducationModel as Education } from "@/generated/prisma/models";
import { FadeInView } from "@/components/motion/FadeInView";

export function EducationSection({ items }: { items: Education[] }) {
  if (items.length === 0) return null;

  return (
    <FadeInView>
      <section id="education" className="flex flex-col gap-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">Education</h2>
        <ul className="flex flex-col gap-6">
          {items.map((item) => (
            <li key={item.id}>
              <p className="font-mono text-xs text-ink-muted uppercase tracking-wide">
                {formatDateRange(item.startDate, item.endDate)}
              </p>
              <h3 className="mt-1 text-lg font-medium">{item.degree}</h3>
              <p className="text-ink-muted">
                {item.institution}
                {item.field ? ` · ${item.field}` : ""}
              </p>
              {item.description && <p className="mt-1 max-w-2xl text-ink-muted">{item.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    </FadeInView>
  );
}
