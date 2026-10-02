import type { Metadata } from "next";
import { getProfile, hasPrivateContact } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/seo";
import { getTurnstileSiteKey } from "@/lib/turnstile-config";
import { ContactSection } from "@/components/sections/ContactSection";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  return pageMetadata({ lang, title: t.nav.contact, description: t.meta.contactDescription, path: "/contact" });
}

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  const [profile, privateContactExists] = await Promise.all([getProfile(lang), hasPrivateContact()]);
  return (
    <ContactSection
      lang={lang}
      publicEmail={profile?.publicEmail ?? ""}
      hasPrivateContact={privateContactExists}
      turnstileSiteKey={getTurnstileSiteKey()}
      asPage
    />
  );
}
