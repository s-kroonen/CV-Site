import type { Metadata } from "next";
import { getSkills, getProfile } from "@/lib/data";
import { pageMetadata, snippet } from "@/lib/seo";
import { SkillsSection } from "@/components/sections/SkillsSection";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const [profile, items] = await Promise.all([getProfile(), getSkills()]);
  const who = profile?.name ? ` of ${profile.name}` : "";
  const description = snippet(`Skills${who}: ${items.map((s) => s.name).join(", ")}`);
  return pageMetadata({ title: "Skills", description, path: "/skills" });
}

export default async function SkillsPage() {
  return <SkillsSection items={await getSkills()} asPage />;
}
