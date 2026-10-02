import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile, getProjectBySlug } from "@/lib/data";
import { JsonLd } from "@/components/site/JsonLd";
import { absoluteUrl, pageMetadata, snippet } from "@/lib/seo";
import { asImages, asStringArray } from "@/lib/json";
import { FadeInView } from "@/components/motion/FadeInView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project not found", robots: { index: false } };

  const description = snippet(project.summary || project.description || project.title);
  const cover = asImages(project.images)[0];
  return pageMetadata({
    title: project.title,
    description,
    path: `/projects/${project.slug}`,
    type: "article",
    // Without a cover image the generated site-wide card is used.
    image: cover ? { url: cover.src, alt: cover.alt || project.title, width: cover.width, height: cover.height } : undefined,
  });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  const tech = asStringArray(project.techStack);
  const images = asImages(project.images);
  const profile = await getProfile();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.title,
    description: project.summary || project.description || undefined,
    url: absoluteUrl(`/projects/${project.slug}`),
    codeRepository: project.repoUrl || undefined,
    keywords: tech.length ? tech.join(", ") : undefined,
    image: images.map((i) => absoluteUrl(i.src)),
    dateModified: project.updatedAt.toISOString(),
    author: profile ? { "@type": "Person", name: profile.name, url: absoluteUrl("/") } : undefined,
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-6 py-16">
      <JsonLd data={jsonLd} />
      <FadeInView>
        <div className="flex flex-col gap-6">
          <Link href="/projects" className="w-fit text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
            ← Back to projects
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
                  alt={img.alt || `${project.title} screenshot ${i + 1}`}
                  width={img.width}
                  height={img.height}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-auto w-full rounded-lg border border-line"
                />
              ))}
            </div>
          )}
          <div className="flex gap-4 text-sm">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                Repository
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                Live site
              </a>
            )}
          </div>
        </div>
      </FadeInView>
    </div>
  );
}
