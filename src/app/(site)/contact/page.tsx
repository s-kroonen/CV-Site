import type { Metadata } from "next";
import { getProfile, hasPrivateContact } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { getTurnstileSiteKey } from "@/lib/turnstile-config";
import { ContactSection } from "@/components/sections/ContactSection";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Get in touch using the contact form.",
  path: "/contact",
});

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
