import type { Metadata } from "next";
import { getProjects, getProfile } from "@/lib/data";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";
import { pageMetadata, snippet } from "@/lib/seo";
import { ProjectsSection } from "@/components/sections/ProjectsSection";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const [profile, items] = await Promise.all([getProfile(lang), getProjects(lang)]);
  const description = snippet(fmt(t.meta.projectsDescription, { name: profile?.name ?? "", list: items.map((p) => p.title).join(", ") }));
  return pageMetadata({ lang, title: t.nav.projects, description, path: "/projects" });
}

export default async function ProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  return <ProjectsSection items={await getProjects(lang)} asPage />;
}
