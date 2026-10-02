import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEducationBySlug, getProfile } from "@/lib/data";
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
  const item = await getEducationBySlug(slug, lang);
  if (!item) return { title: t.common.notFoundTitle, robots: { index: false } };

  const heading = item.degree || item.institution;
  const fallback = fmt(t.detail.educationDetailDescription, { degree: item.degree, institution: item.institution });
  return pageMetadata({
    lang,
    title: heading,
    description: snippet(item.description || fallback),
    path: `/education/${item.slug}`,
    type: "article",
  });
}

export default async function EducationDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const item = await getEducationBySlug(slug, lang);
  if (!item) notFound();

  const profile = await getProfile(lang);
  const dates = formatDateRange(item.startDate, item.endDate, lang, t.common);
  const path = localizedPath(lang, `/education/${item.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(path),
    inLanguage: lang,
    name: item.degree || item.institution,
    mainEntity: profile
      ? {
          "@type": "Person",
          name: profile.name,
          url: absoluteUrl(localizedPath(lang, "/")),
          alumniOf: item.institution ? { "@type": "EducationalOrganization", name: item.institution } : undefined,
        }
      : undefined,
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-8 py-16">
      <JsonLd data={jsonLd} />
      <FadeInView>
        <div className="flex flex-col gap-6">
          <Link href={localizedPath(lang, "/education")} className="w-fit text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
            {t.detail.backToEducation}
          </Link>
          <header className="flex flex-col gap-2">
            {dates && <p className="font-mono text-xs text-ink-muted uppercase tracking-wide">{dates}</p>}
            <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-4xl font-medium">
              {item.logoPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.logoPath} alt="" width={40} height={40} className="h-10 w-10 rounded object-contain" />
              )}
              {item.degree || item.institution}
            </h1>
            {[item.degree ? item.institution : "", item.field].filter(Boolean).length > 0 && (
              <p className="text-ink-muted">{[item.degree ? item.institution : "", item.field].filter(Boolean).join(" · ")}</p>
            )}
          </header>

          {item.description && <p className="max-w-2xl whitespace-pre-wrap text-ink-muted">{item.description}</p>}

          <RelatedList
            title={t.detail.relatedExperience}
            items={item.experiences.map((e) => ({
              id: e.id,
              href: localizedPath(lang, e.slug ? `/experience/${e.slug}` : "/experience"),
              title: e.title || e.company,
              subtitle: e.title ? e.company : undefined,
              summary: e.description,
            }))}
          />
          <RelatedList
            title={t.detail.projectsFromStudy}
            items={item.projects.map((p) => ({
              id: p.id,
              href: localizedPath(lang, `/projects/${p.slug}`),
              title: p.title,
              summary: p.summary,
            }))}
          />
        </div>
      </FadeInView>
    </div>
  );
}
