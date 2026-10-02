import type { Metadata } from "next";
import { getEducation, getProfile } from "@/lib/data";
import { pageMetadata, snippet } from "@/lib/seo";
import { EducationSection } from "@/components/sections/EducationSection";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const [profile, items] = await Promise.all([getProfile(), getEducation()]);
  const who = profile?.name ? ` of ${profile.name}` : "";
  const description = snippet(`Education${who}: ${items.map((e) => [e.degree, e.institution].filter(Boolean).join(" - ")).join(", ")}`);
  return pageMetadata({ title: "Education", description, path: "/education" });
}

export default async function EducationPage() {
  return <EducationSection items={await getEducation()} asPage />;
}
