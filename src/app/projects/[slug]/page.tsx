import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectBySlug } from "@/lib/data";
import { asStringArray } from "@/lib/json";
import { FadeInView } from "@/components/motion/FadeInView";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  const tech = asStringArray(project.techStack);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <FadeInView>
        <div className="flex flex-col gap-6">
          <Link href="/#projects" className="w-fit text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
            ← Back to projects
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium">{project.title}</h1>
          <p className="text-ink-muted">{project.summary}</p>
          {tech.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tech.map((t) => (
                <span key={t} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
          <p className="max-w-2xl whitespace-pre-wrap text-ink-muted">{project.description}</p>
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
    </main>
  );
}
