import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile, getProjectBySlug } from "@/lib/data";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { localizedPath } from "@/lib/i18n/config";
import { resolveLang } from "@/lib/i18n/params";
import { JsonLd } from "@/components/site/JsonLd";
import { RelatedList } from "@/components/site/RelatedList";
import { absoluteUrl, pageMetadata, snippet } from "@/lib/seo";
import { asImages, asStringArray } from "@/lib/json";
import { FadeInView } from "@/components/motion/FadeInView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolveLang(params);
  const project = await getProjectBySlug(slug, lang);
  if (!project) return { title: getDictionary(lang).meta.projectNotFound, robots: { index: false } };

  const description = snippet([project.summary, project.description].filter(Boolean).join(" - ") || project.title);
  const cover = asImages(project.images)[0];
  return pageMetadata({
    lang,
    title: project.title,
    description,
    path: `/projects/${project.slug}`,
    type: "article",
    // Without a cover image the generated site-wide card is used.
    image: cover ? { url: cover.src, alt: cover.alt || project.title, width: cover.width, height: cover.height } : undefined,
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const project = await getProjectBySlug(slug, lang);

  if (!project) notFound();

  const tech = asStringArray(project.techStack);
  const images = asImages(project.images);
  const profile = await getProfile(lang);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.title,
    description: project.summary || project.description || undefined,
    url: absoluteUrl(localizedPath(lang, `/projects/${project.slug}`)),
    inLanguage: lang,
    codeRepository: project.repoUrl || undefined,
    keywords: tech.length ? tech.join(", ") : undefined,
    image: images.map((i) => absoluteUrl(i.src)),
    dateModified: project.updatedAt.toISOString(),
    author: profile ? { "@type": "Person", name: profile.name, url: absoluteUrl(localizedPath(lang, "/")) } : undefined,
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-6 py-16">
      <JsonLd data={jsonLd} />
      <FadeInView>
        <div className="flex flex-col gap-6">
          <Link href={localizedPath(lang, "/projects")} className="w-fit text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
            {t.common.backToProjects}
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium">{project.title}</h1>
          {project.summary && <p className="text-ink-muted">{project.summary}</p>}
          {tech.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tech.map((t) => (
                <span key={t} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
          {project.description && <p className="max-w-2xl whitespace-pre-wrap text-ink-muted">{project.description}</p>}
          {images.length > 0 && (
            <div className="flex flex-col gap-4">
              {images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.src}
                  src={img.src}
                  alt={img.alt || fmt(t.common.screenshot, { title: project.title, n: i + 1 })}
                  width={img.width}
                  height={img.height}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-auto w-full rounded-lg border border-line"
                />
              ))}
            </div>
          )}
          <RelatedList
            title={t.detail.experience}
            items={project.experiences.map((e) => ({
              id: e.id,
              href: localizedPath(lang, e.slug ? `/experience/${e.slug}` : "/experience"),
              title: e.title || e.company,
              subtitle: e.title ? e.company : undefined,
            }))}
          />
          <div className="flex gap-4 text-sm">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                {t.common.repository}
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                {t.common.liveSite}
              </a>
            )}
          </div>
        </div>
      </FadeInView>
    </div>
  );
}
