import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RootShell } from "@/components/RootShell";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { Backdrop } from "@/components/site/Backdrop";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getLastUpdated, getNavTabs, getProfile, hasPrivateContact } from "@/lib/data";
import { getTurnstileSiteKey } from "@/lib/turnstile-config";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { languageAlternates, alternateTypes, siteUrl, snippet, socialImage } from "@/lib/seo";
import { OG_LOCALES, localizedPath, otherLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const profile = await getProfile(lang);
  const name = profile?.name || getDictionary(lang).meta.role;
  // Tagline first, then the start of the bio, so the snippet in search results says something useful.
  const description = snippet([profile?.tagline, profile?.bio].filter(Boolean).join(" - ") || getDictionary(lang).meta.role);
  const image = socialImage(lang);
  return {
    // Resolves relative URLs (canonical, og:image) against the public address, not the request host.
    metadataBase: new URL(siteUrl()),
    title: { default: name, template: `%s · ${name}` },
    description,
    applicationName: name,
    authors: [{ name }],
    // Defaults for the home page; every other page sets its own full set via pageMetadata().
    alternates: { canonical: localizedPath(lang, "/"), languages: languageAlternates("/"), types: alternateTypes },
    openGraph: {
      type: "website",
      siteName: name,
      title: name,
      description,
      locale: OG_LOCALES[lang],
      alternateLocale: [OG_LOCALES[otherLocale(lang)]],
      url: localizedPath(lang, "/"),
      images: [image],
    },
    twitter: { card: "summary_large_image", title: name, description, images: [image.url] },
    robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
    // Search Console / Bing verification codes come from the environment so no redeploy of code is needed.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dictionary = getDictionary(lang);
  const [profile, tabs, updated, privateContact] = await Promise.all([getProfile(lang), getNavTabs(lang), getLastUpdated(), hasPrivateContact()]);
  const updatedLabel = updated
    ? fmt(dictionary.common.lastUpdated, {
        date: new Intl.DateTimeFormat(lang === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(updated),
      })
    : null;

  return (
    <RootShell lang={lang}>
      <LocaleProvider lang={lang} dictionary={dictionary}>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-accent px-4 py-2 text-sm text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {dictionary.common.skipToContent}
        </a>
        <Backdrop />
        <SiteHeader lang={lang} tabs={tabs} />
        <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">{children}</main>
        <SiteFooter lang={lang} profile={profile} hasPrivateContact={privateContact} turnstileSiteKey={getTurnstileSiteKey()} updatedLabel={updatedLabel} />
      </LocaleProvider>
    </RootShell>
  );
}
