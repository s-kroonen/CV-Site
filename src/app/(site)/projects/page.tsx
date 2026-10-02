import type { Metadata } from "next";
import { getProjects, getProfile } from "@/lib/data";
import { pageMetadata, snippet } from "@/lib/seo";
import { ProjectsSection } from "@/components/sections/ProjectsSection";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const [profile, items] = await Promise.all([getProfile(), getProjects()]);
  const who = profile?.name ? ` of ${profile.name}` : "";
  const description = snippet(`Projects${who}: ${items.map((p) => p.title).join(", ")}`);
  return pageMetadata({ title: "Projects", description, path: "/projects" });
}

export default async function ProjectsPage() {
  return <ProjectsSection items={await getProjects()} asPage />;
}
