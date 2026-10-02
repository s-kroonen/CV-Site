import type { EducationModel, ExperienceModel, ProfileModel } from "@/generated/prisma/models";
import { asSocialLinks } from "@/lib/json";
import { absoluteUrl, siteUrl } from "@/lib/seo";

/** schema.org Person (as a ProfilePage) for the home page. Only data that is already public. */
export function personJsonLd(profile: ProfileModel, experience: ExperienceModel[], education: EducationModel[]) {
  const links = asSocialLinks(profile.socialLinks).map((l) => l.url);
  const current = experience.find((e) => !e.endDate && e.company);
  const person = {
    "@type": "Person",
    "@id": `${siteUrl()}/#person`,
    name: profile.name,
    url: absoluteUrl("/"),
    jobTitle: profile.tagline || undefined,
    description: profile.bio || undefined,
    email: profile.publicEmail ? `mailto:${profile.publicEmail}` : undefined,
    image: profile.avatarPath ? absoluteUrl(profile.avatarPath) : undefined,
    address: profile.location ? { "@type": "PostalAddress", addressLocality: profile.location } : undefined,
    sameAs: links.length ? links : undefined,
    worksFor: current ? { "@type": "Organization", name: current.company } : undefined,
    alumniOf: education
      .filter((e) => e.institution)
      .map((e) => ({ "@type": "EducationalOrganization", name: e.institution })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "ProfilePage",
        "@id": `${siteUrl()}/#profile`,
        url: absoluteUrl("/"),
        name: profile.name,
        mainEntity: { "@id": person["@id"] },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        url: absoluteUrl("/"),
        name: profile.name,
        publisher: { "@id": person["@id"] },
      },
    ],
  };
}
