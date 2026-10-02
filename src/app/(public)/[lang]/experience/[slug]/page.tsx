import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExperienceBySlug, getProfile } from "@/lib/data";
import { asStringArray } from "@/lib/json";
import { formatDateRange } from "@/lib/format";
import { localizedPath } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";
import { absoluteUrl, pageMetadata, snippet } from "@/lib/seo";
import { FadeInView } from "@/components/motion/FadeInView";
import { JsonLd } from "@/components/site/JsonLd";
import { RelatedList } from "@/components/site/RelatedList";

export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const item = await getExperienceBySlug(slug, lang);
  if (!item) return { title: t.common.notFoundTitle, robots: { index: false } };

  const heading = [item.title, item.company].filter(Boolean).join(" · ");
  const fallback = fmt(t.detail.experienceDetailDescription, { title: item.title, company: item.company });
  return pageMetadata({
    lang,
    title: heading,
    description: snippet(item.description || fallback),
    path: `/experience/${item.slug}`,
    type: "article",
  });
}

export default async function ExperienceDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const item = await getExperienceBySlug(slug, lang);
  if (!item) notFound();

  const profile = await getProfile(lang);
  const bullets = asStringArray(item.bullets);
  const tags = asStringArray(item.tags);
  const dates = formatDateRange(item.startDate, item.endDate, lang, t.common);
  const path = localizedPath(lang, `/experience/${item.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(path),
    inLanguage: lang,
    name: [item.title, item.company].filter(Boolean).join(" · "),
    mainEntity: {
      "@type": "OrganizationRole",
      roleName: item.title || undefined,
      startDate: item.startDate?.toISOString().slice(0, 10),
      endDate: item.endDate?.toISOString().slice(0, 10),
      description: item.description || undefined,
      member: profile ? { "@type": "Person", name: profile.name, url: absoluteUrl(localizedPath(lang, "/")) } : undefined,
      memberOf: item.company ? { "@type": "Organization", name: item.company } : undefined,
    },
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-8 py-16">
      <JsonLd data={jsonLd} />
      <FadeInView>
        <div className="flex flex-col gap-6">
          <Link href={localizedPath(lang, "/experience")} className="w-fit text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
            {t.detail.backToExperience}
          </Link>
          <header className="flex flex-col gap-2">
            {dates && <p className="font-mono text-xs text-ink-muted uppercase tracking-wide">{dates}</p>}
            <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-4xl font-medium">
              {item.logoPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.logoPath} alt="" width={40} height={40} className="h-10 w-10 rounded object-contain" />
              )}
              <span>
                {item.title}
                {item.title && item.company && <span className="text-ink-muted"> · </span>}
                <span className={item.title ? "text-ink-muted" : ""}>{item.company}</span>
              </span>
            </h1>
            {item.location && <p className="text-ink-muted">{item.location}</p>}
          </header>

          {item.description && <p className="max-w-2xl whitespace-pre-wrap text-ink-muted">{item.description}</p>}

          {bullets.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium">{t.detail.highlights}</h2>
              <ul className="list-disc pl-5 text-ink-muted">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <RelatedList
            title={t.detail.projectsFromRole}
            items={item.projects.map((p) => ({
              id: p.id,
              href: localizedPath(lang, `/projects/${p.slug}`),
              title: p.title,
              summary: p.summary,
            }))}
          />
          <RelatedList
            title={t.detail.relatedEducation}
            items={item.education.map((e) => ({
              id: e.id,
              href: localizedPath(lang, e.slug ? `/education/${e.slug}` : "/education"),
              title: e.degree || e.institution,
              subtitle: e.degree ? e.institution : undefined,
            }))}
          />
        </div>
      </FadeInView>
    </div>
  );
}
