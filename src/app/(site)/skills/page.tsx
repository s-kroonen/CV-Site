import type { Metadata } from "next";
import { getSkills } from "@/lib/data";
import { SkillsSection } from "@/components/sections/SkillsSection";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Skills" };

export default async function SkillsPage() {
  return <SkillsSection items={await getSkills()} asPage />;
}
