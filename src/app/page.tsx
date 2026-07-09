import { getProfile, getExperience, getEducation, getProjects, getSkills } from "@/lib/data";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { EducationSection } from "@/components/sections/EducationSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ContactSection } from "@/components/sections/ContactSection";

// Content is edited live via the admin panel, so this must always read
// current DB state rather than being baked in at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [profile, experience, education, projects, skills] = await Promise.all([
    getProfile(),
    getExperience(),
    getEducation(),
    getProjects(),
    getSkills(),
  ]);

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-center text-ink-muted">
        Site content hasn&apos;t been set up yet.
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
      <Hero profile={profile} />
      <About profile={profile} />
      <ExperienceSection items={experience} />
      <EducationSection items={education} />
      <ProjectsSection items={projects} />
      <SkillsSection items={skills} />
      <ContactSection publicEmail={profile.publicEmail} />
    </main>
  );
}
