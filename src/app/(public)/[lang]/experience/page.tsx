import type { Metadata } from "next";
import { getExperience, getProfile } from "@/lib/data";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";
import { pageMetadata, snippet } from "@/lib/seo";
import { ExperienceSection } from "@/components/sections/ExperienceSection";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const [profile, items] = await Promise.all([getProfile(lang), getExperience(lang)]);
  const list = items.map((e) => [e.title, e.company].filter(Boolean).join(" · ")).join(", ");
  const description = snippet(fmt(t.meta.experienceDescription, { name: profile?.name ?? "", list }));
  return pageMetadata({ lang, title: t.nav.experience, description, path: "/experience" });
}

export default async function ExperiencePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  return <ExperienceSection items={await getExperience(lang)} asPage />;
}
