import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { ProfileModel as Profile } from "@/generated/prisma/models";
import { SectionHeading } from "@/components/site/SectionHeading";
import { FadeInView } from "@/components/motion/FadeInView";

export function About({ profile, lang, asPage = false }: { profile: Profile; lang: Locale; asPage?: boolean }) {
  if (!profile.bio) return null;
  return (
    <FadeInView>
      <section id="about" className="flex flex-col gap-4 py-16">
        <SectionHeading title={getDictionary(lang).sections.about} asPage={asPage} />
        <p className="max-w-2xl leading-relaxed whitespace-pre-wrap text-ink-muted">{profile.bio}</p>
      </section>
    </FadeInView>
  );
}
