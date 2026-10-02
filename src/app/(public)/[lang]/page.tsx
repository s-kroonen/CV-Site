import Link from "next/link";
import { getProfile, getExperience, getEducation, getProjects, getSkills } from "@/lib/data";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { FadeInView } from "@/components/motion/FadeInView";
import { JsonLd } from "@/components/site/JsonLd";
import { localizedPath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";
import { personJsonLd } from "@/lib/structured-data";

// Content is edited live via the admin panel, so this must always read
// current DB state rather than being baked in at build time.
export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  const t = getDictionary(lang);
  const [profile, experience, education, projects, skills] = await Promise.all([
    getProfile(lang),
    getExperience(lang),
    getEducation(lang),
    getProjects(lang),
    getSkills(lang),
  ]);

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-ink-muted">{t.common.notSetUp}</div>
    );
  }

  const topSkills = skills.slice(0, 12);

  return (
    <>
      <JsonLd data={personJsonLd(profile, experience, education, lang)} />
      <Hero profile={profile} />
      <About profile={profile} lang={lang} />
      <ExperienceSection items={experience} limit={2} moreHref={localizedPath(lang, "/experience")} />
      <ProjectsSection items={projects} limit={2} moreHref={localizedPath(lang, "/projects")} />
      {topSkills.length > 0 && (
        <FadeInView>
          <section className="flex flex-col gap-4 py-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">{t.sections.skills}</h2>
              <Link
                href={localizedPath(lang, "/skills")}
                className="text-sm text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                {t.common.viewAll}
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2">
              {topSkills.map((skill) => (
                <li key={skill.id} className="rounded-full border border-line px-3 py-1 text-sm text-ink-muted">
                  {skill.name}
                </li>
              ))}
            </ul>
          </section>
        </FadeInView>
      )}
      <FadeInView>
        <section className="flex flex-col items-start gap-3 py-12 pb-24">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">{t.sections.getInTouch}</h2>
          <p className="max-w-md text-ink-muted">{t.common.getInTouchText}</p>
          <Link
            href={localizedPath(lang, "/contact")}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            {t.common.contactMe}
          </Link>
        </section>
      </FadeInView>
    </>
  );
}
