import type { Metadata } from "next";
import { getEducation, getProfile } from "@/lib/data";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";
import { pageMetadata, snippet } from "@/lib/seo";
import { EducationSection } from "@/components/sections/EducationSection";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const [profile, items] = await Promise.all([getProfile(lang), getEducation(lang)]);
  const list = items.map((e) => [e.degree, e.institution].filter(Boolean).join(" - ")).join(", ");
  const description = snippet(fmt(t.meta.educationDescription, { name: profile?.name ?? "", list }));
  return pageMetadata({ lang, title: t.nav.education, description, path: "/education" });
}

export default async function EducationPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  return <EducationSection lang={lang} items={await getEducation(lang)} asPage />;
}
