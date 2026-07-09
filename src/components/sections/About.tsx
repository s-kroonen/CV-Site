import type { ProfileModel as Profile } from "@/generated/prisma/models";
import { FadeInView } from "@/components/motion/FadeInView";

export function About({ profile }: { profile: Profile }) {
  return (
    <FadeInView>
      <section id="about" className="flex flex-col gap-4 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">About</h2>
        <p className="max-w-2xl leading-relaxed whitespace-pre-wrap text-ink-muted">{profile.bio}</p>
      </section>
    </FadeInView>
  );
}
