import { getEducation, getExperience, getProfile, getProjects, getSkills } from "@/lib/data";
import {
  serializeEducation,
  serializeExperience,
  serializeProfile,
  serializeProject,
  serializeSkill,
} from "@/lib/content-service";
import { absoluteUrl, siteUrl } from "@/lib/seo";

type Row = Record<string, unknown>;
export type PublicCv = {
  name: string;
  url: string;
  profile: Row | null;
  experience: Row[];
  education: Row[];
  projects: Row[];
  skills: Row[];
};

const publicFields = (r: Row): Row => {
  const copy = { ...r };
  delete copy.archivedAt;
  delete copy.deletedAt;
  delete copy.sortIndex;
  return copy;
};

/** Everything that is visible on the public site (active items only; never private contact details). */
export async function getPublicCv(): Promise<PublicCv> {
  const [profile, experience, education, projects, skills] = await Promise.all([
    getProfile(),
    getExperience(),
    getEducation(),
    getProjects(),
    getSkills(),
  ]);
  return {
    name: profile?.name ?? "",
    url: siteUrl(),
    profile: profile ? serializeProfile(profile) : null,
    experience: experience.map((r) => publicFields(serializeExperience(r))),
    education: education.map((r) => publicFields(serializeEducation(r))),
    projects: projects.map((r) => publicFields(serializeProject(r))),
    skills: skills.map((r) => publicFields(serializeSkill(r))),
  };
}

const month = (iso: unknown) =>
  typeof iso === "string" && iso
    ? new Date(iso).toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" })
    : "";
const range = (start: unknown, end: unknown) => {
  const s = month(start);
  const e = month(end);
  if (!s && !e) return "";
  return `${s || "?"} - ${e || "present"}`;
};
const list = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(String) : []);

/** The whole CV as Markdown: easy for LLMs and agents to ingest. */
export function toMarkdown(cv: PublicCv): string {
  const p = cv.profile ?? {};
  const out: string[] = [`# ${cv.name || "CV"}`];
  if (p.tagline) out.push(`\n${p.tagline}`);
  const facts = [
    p.location && `Location: ${p.location}`,
    p.publicEmail && `Email: ${p.publicEmail}`,
    `Website: ${cv.url}`,
    ...((p.socialLinks as { label: string; url: string }[] | undefined) ?? []).map((l) => `${l.label}: ${l.url}`),
  ].filter(Boolean);
  out.push("\n" + facts.map((f) => `- ${f}`).join("\n"));
  if (p.bio) out.push(`\n## About\n\n${p.bio}`);

  if (cv.experience.length) {
    out.push("\n## Experience");
    for (const e of cv.experience) {
      out.push(`\n### ${[e.title, e.company].filter(Boolean).join(" at ")}`);
      const meta = [range(e.startDate, e.endDate), e.location].filter(Boolean).join(" | ");
      if (meta) out.push(meta);
      if (e.description) out.push(`\n${e.description}`);
      const bullets = list(e.bullets);
      if (bullets.length) out.push("\n" + bullets.map((b) => `- ${b}`).join("\n"));
      const tags = list(e.tags);
      if (tags.length) out.push(`\nTags: ${tags.join(", ")}`);
    }
  }
  if (cv.education.length) {
    out.push("\n## Education");
    for (const e of cv.education) {
      out.push(`\n### ${[e.degree, e.institution].filter(Boolean).join(" - ")}`);
      const meta = [e.field, range(e.startDate, e.endDate)].filter(Boolean).join(" | ");
      if (meta) out.push(meta);
      if (e.description) out.push(`\n${e.description}`);
    }
  }
  if (cv.projects.length) {
    out.push("\n## Projects");
    for (const pr of cv.projects) {
      out.push(`\n### ${pr.title}`);
      out.push(`URL: ${absoluteUrl(`/projects/${pr.slug}`)}`);
      if (pr.summary) out.push(`\n${pr.summary}`);
      if (pr.description) out.push(`\n${pr.description}`);
      const tech = list(pr.techStack);
      if (tech.length) out.push(`\nTech: ${tech.join(", ")}`);
      if (pr.repoUrl) out.push(`Repository: ${pr.repoUrl}`);
      if (pr.liveUrl) out.push(`Live: ${pr.liveUrl}`);
    }
  }
  if (cv.skills.length) {
    out.push("\n## Skills");
    const byCat = new Map<string, string[]>();
    for (const s of cv.skills) {
      const cat = String(s.category || "Other");
      byCat.set(cat, [...(byCat.get(cat) ?? []), String(s.name)]);
    }
    for (const [cat, names] of byCat) out.push(`- ${cat}: ${names.join(", ")}`);
  }
  return out.join("\n") + "\n";
}

/** /llms.txt index following the llmstxt.org convention. */
export function toLlmsTxt(cv: PublicCv): string {
  const p = cv.profile ?? {};
  const lines = [`# ${cv.name || "CV"}`, ""];
  const summary = [p.tagline, p.location].filter(Boolean).join(" - ");
  if (summary) lines.push(`> ${summary}`, "");
  if (p.bio) lines.push(String(p.bio), "");
  lines.push("## Content", "");
  lines.push(`- [Full CV as Markdown](${absoluteUrl("/llms-full.txt")}): everything on this site in one document`);
  lines.push(`- [CV as JSON](${absoluteUrl("/api/cv.json")}): structured data`);
  lines.push(`- [CV as PDF](${absoluteUrl("/api/cv")}): printable CV`);
  lines.push("", "## Pages", "");
  lines.push(`- [Overview](${absoluteUrl("/")}): introduction and highlights`);
  if (cv.experience.length) lines.push(`- [Experience](${absoluteUrl("/experience")}): work and internships`);
  if (cv.education.length) lines.push(`- [Education](${absoluteUrl("/education")}): studies`);
  if (cv.projects.length) lines.push(`- [Projects](${absoluteUrl("/projects")}): selected projects`);
  if (cv.skills.length) lines.push(`- [Skills](${absoluteUrl("/skills")}): technical skills`);
  lines.push(`- [Contact](${absoluteUrl("/contact")}): contact form`);
  if (cv.projects.length) {
    lines.push("", "## Projects", "");
    for (const pr of cv.projects) {
      lines.push(`- [${pr.title}](${absoluteUrl(`/projects/${pr.slug}`)})${pr.summary ? `: ${pr.summary}` : ""}`);
    }
  }
  return lines.join("\n") + "\n";
}
