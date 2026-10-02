import type { Metadata } from "next";
import { getProjects } from "@/lib/data";
import { ProjectsSection } from "@/components/sections/ProjectsSection";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  return <ProjectsSection items={await getProjects()} asPage />;
}
