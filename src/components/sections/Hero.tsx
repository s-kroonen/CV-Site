import { asSocialLinks } from "@/lib/json";
import type { ProfileModel as Profile } from "@/generated/prisma/models";
import { HeroContent } from "./HeroContent";

export function Hero({ profile }: { profile: Profile }) {
  const links = asSocialLinks(profile.socialLinks);

  return (
    <section id="top" className="relative flex flex-col gap-4 overflow-hidden py-16 sm:py-24">
      <HeroContent avatarPath={profile.avatarPath} name={profile.name} tagline={profile.tagline} location={profile.location} publicEmail={profile.publicEmail} links={links} />
    </section>
  );
}
