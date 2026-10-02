import type { Metadata } from "next";
import { getNavTabs, getProfile } from "@/lib/data";
import { Backdrop } from "@/components/site/Backdrop";
import { alternateTypes, defaultSocialImage, siteUrl, snippet } from "@/lib/seo";
import { SiteHeader } from "@/components/site/SiteHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const name = profile?.name || "CV & portfolio";
  const description = snippet(profile?.tagline || profile?.bio || "CV & portfolio");
  return {
    // Resolves relative URLs (canonical, og:image) against the public address, not the request host.
    metadataBase: new URL(siteUrl()),
    title: { default: name, template: `%s · ${name}` },
    description,
    applicationName: name,
    authors: [{ name }],
    // Defaults for the home page; every other page sets its own full set via pageMetadata().
    alternates: { canonical: "/", types: alternateTypes },
    openGraph: { type: "website", siteName: name, title: name, description, locale: "en_US", url: "/", images: [defaultSocialImage] },
    twitter: { card: "summary_large_image", title: name, description, images: [defaultSocialImage.url] },
    robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
    // Search Console / Bing verification codes come from the environment so no redeploy of code is needed.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, tabs] = await Promise.all([getProfile(), getNavTabs()]);

  return (
    <>
      <Backdrop />
      <SiteHeader name={profile?.name ?? ""} avatarPath={profile?.avatarPath} tabs={tabs} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">{children}</main>
      <footer className="border-t border-line py-8 text-center text-xs text-ink-muted">
        {profile?.name ? `© ${new Date().getFullYear()} ${profile.name}` : null}
      </footer>
    </>
  );
}
