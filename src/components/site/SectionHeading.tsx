import Link from "next/link";

/** Section title. `asPage` makes it the page's h1 (tab pages); otherwise an h2 with an optional "view all" link (overview). */
export function SectionHeading({
  title,
  asPage = false,
  moreHref,
}: {
  title: string;
  asPage?: boolean;
  moreHref?: string;
}) {
  const className = "font-[family-name:var(--font-display)] text-3xl font-medium";
  return (
    <div className="flex items-baseline justify-between gap-4">
      {asPage ? <h1 className={className}>{title}</h1> : <h2 className={className}>{title}</h2>}
      {moreHref && (
        <Link href={moreHref} className="text-sm text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
          View all →
        </Link>
      )}
    </div>
  );
}
