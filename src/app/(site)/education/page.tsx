import type { Metadata } from "next";
import { getEducation } from "@/lib/data";
import { EducationSection } from "@/components/sections/EducationSection";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Education" };

export default async function EducationPage() {
  return <EducationSection items={await getEducation()} asPage />;
}
