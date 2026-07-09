import { asSocialLinks } from "@/lib/json";
import type { ProfileModel as Profile } from "@/generated/prisma/models";
import { HeroContent } from "./HeroContent";

export function Hero({ profile }: { profile: Profile }) {
  const links = asSocialLinks(profile.socialLinks);

  return (
    <section id="top" className="relative flex flex-col gap-4 overflow-hidden py-28 sm:py-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full opacity-40 blur-3xl sm:h-96 sm:w-96"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />
      <HeroContent name={profile.name} tagline={profile.tagline} location={profile.location} publicEmail={profile.publicEmail} links={links} />
    </section>
  );
}
