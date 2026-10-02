import type { Metadata } from "next";
import { getNavTabs, getProfile } from "@/lib/data";
import { SiteHeader } from "@/components/site/SiteHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const name = profile?.name || "CV & portfolio";
  return {
    title: { default: name, template: `%s · ${name}` },
    description: profile?.tagline || "CV & portfolio",
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, tabs] = await Promise.all([getProfile(), getNavTabs()]);

  return (
    <>
      <SiteHeader name={profile?.name ?? ""} avatarPath={profile?.avatarPath} tabs={tabs} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">{children}</main>
      <footer className="border-t border-line py-8 text-center text-xs text-ink-muted">
        {profile?.name ? `© ${new Date().getFullYear()} ${profile.name}` : null}
      </footer>
    </>
  );
}
