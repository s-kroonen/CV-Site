import type { Metadata } from "next";
import { getExperience, getProfile } from "@/lib/data";
import { pageMetadata, snippet } from "@/lib/seo";
import { ExperienceSection } from "@/components/sections/ExperienceSection";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const [profile, items] = await Promise.all([getProfile(), getExperience()]);
  const who = profile?.name ? ` of ${profile.name}` : "";
  const description = snippet(`Work experience${who}: ${items.map((e) => [e.title, e.company].filter(Boolean).join(" at ")).join(", ")}`);
  return pageMetadata({ title: "Experience", description, path: "/experience" });
}

export default async function ExperiencePage() {
  return <ExperienceSection items={await getExperience()} asPage />;
}
