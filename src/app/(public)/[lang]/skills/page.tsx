import type { Metadata } from "next";
import { getSkills, getProfile } from "@/lib/data";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";
import { pageMetadata, snippet } from "@/lib/seo";
import { SkillsSection } from "@/components/sections/SkillsSection";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const [profile, items] = await Promise.all([getProfile(lang), getSkills(lang)]);
  const description = snippet(fmt(t.meta.skillsDescription, { name: profile?.name ?? "", list: items.map((s) => s.name).join(", ") }));
  return pageMetadata({ lang, title: t.nav.skills, description, path: "/skills" });
}

export default async function SkillsPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  return <SkillsSection items={await getSkills(lang)} asPage />;
}
