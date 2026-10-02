import Link from "next/link";

export type RelatedItem = { id: string; href: string; title: string; subtitle?: string; summary?: string };

/** A titled list of links to related items (projects, experience, education). Renders nothing when empty. */
export function RelatedList({ title, items }: { title: string; items: RelatedItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex h-full flex-col gap-1 rounded-lg border border-line p-4 transition-shadow hover:shadow-md"
            >
              <span className="font-medium">{item.title}</span>
              {item.subtitle && <span className="text-sm text-ink-muted">{item.subtitle}</span>}
              {item.summary && <span className="line-clamp-2 text-sm text-ink-muted">{item.summary}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
