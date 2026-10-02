import type { Metadata } from "next";
import { getExperience } from "@/lib/data";
import { ExperienceSection } from "@/components/sections/ExperienceSection";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Experience" };

export default async function ExperiencePage() {
  return <ExperienceSection items={await getExperience()} asPage />;
}
