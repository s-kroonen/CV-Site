import type { Metadata } from "next";
import { getProfile, hasPrivateContact } from "@/lib/data";
import { getTurnstileSiteKey } from "@/lib/turnstile-config";
import { ContactSection } from "@/components/sections/ContactSection";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const [profile, privateContactExists] = await Promise.all([getProfile(), hasPrivateContact()]);
  return (
    <ContactSection
      publicEmail={profile?.publicEmail ?? ""}
      hasPrivateContact={privateContactExists}
      turnstileSiteKey={getTurnstileSiteKey()}
      asPage
    />
  );
}
