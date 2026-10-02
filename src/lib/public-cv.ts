import { getEducation, getExperience, getProfile, getProjects, getSkills } from "@/lib/data";
import {
  serializeEducation,
  serializeExperience,
  serializeProfile,
  serializeProject,
  serializeSkill,
} from "@/lib/content-service";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

type Row = Record<string, unknown>;
export type PublicCv = {
  lang: Locale;
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

/** Everything that is visible on the public site in `lang` (active items only; never private contact details). */
export async function getPublicCv(lang: Locale = DEFAULT_LOCALE): Promise<PublicCv> {
  const [profile, experience, education, projects, skills] = await Promise.all([
    getProfile(lang),
    getExperience(lang),
    getEducation(lang),
    getProjects(lang),
    getSkills(lang),
  ]);
  return {
    lang,
    name: profile?.name ?? "",
    url: siteUrl(),
    profile: profile ? serializeProfile(profile) : null,
    experience: experience.map((r) => publicFields(serializeExperience(r))),
    education: education.map((r) => publicFields(serializeEducation(r))),
    projects: projects.map((r) => publicFields(serializeProject(r))),
    skills: skills.map((r) => publicFields(serializeSkill(r))),
  };
}

const month = (iso: unknown, lang: Locale) =>
  typeof iso === "string" && iso
    ? new Date(iso).toLocaleString(lang === "nl" ? "nl-NL" : "en", { month: "short", year: "numeric", timeZone: "UTC" })
    : "";
const range = (start: unknown, end: unknown, lang: Locale) => {
  const s = month(start, lang);
  const e = month(end, lang);
  if (!s && !e) return "";
  return `${s || "?"} - ${e || getDictionary(lang).common.present}`;
};
const list = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(String) : []);

/** The whole CV as Markdown: easy for LLMs and agents to ingest. */
export function toMarkdown(cv: PublicCv): string {
  const p = cv.profile ?? {};
  const t = getDictionary(cv.lang);
  const out: string[] = [`# ${cv.name || "CV"}`];
  if (p.tagline) out.push(`\n${p.tagline}`);
  const facts = [
    p.location && `${t.md.location}: ${p.location}`,
    p.publicEmail && `${t.md.email}: ${p.publicEmail}`,
    `${t.md.website}: ${absoluteUrl(localizedPath(cv.lang, "/"))}`,
    ...((p.socialLinks as { label: string; url: string }[] | undefined) ?? []).map((l) => `${l.label}: ${l.url}`),
  ].filter(Boolean);
  out.push("\n" + facts.map((f) => `- ${f}`).join("\n"));
  if (p.bio) out.push(`\n## ${t.sections.about}\n\n${p.bio}`);

  if (cv.experience.length) {
    out.push(`\n## ${t.sections.experience}`);
    for (const e of cv.experience) {
      out.push(`\n### ${[e.title, e.company].filter(Boolean).join(" · ")}`);
      const meta = [range(e.startDate, e.endDate, cv.lang), e.location].filter(Boolean).join(" | ");
      if (meta) out.push(meta);
      if (e.description) out.push(`\n${e.description}`);
      const bullets = list(e.bullets);
      if (bullets.length) out.push("\n" + bullets.map((b) => `- ${b}`).join("\n"));
      const tags = list(e.tags);
      if (tags.length) out.push(`\n${t.md.tags}: ${tags.join(", ")}`);
    }
  }
  if (cv.education.length) {
    out.push(`\n## ${t.sections.education}`);
    for (const e of cv.education) {
      out.push(`\n### ${[e.degree, e.institution].filter(Boolean).join(" - ")}`);
      const meta = [e.field, range(e.startDate, e.endDate, cv.lang)].filter(Boolean).join(" | ");
      if (meta) out.push(meta);
      if (e.description) out.push(`\n${e.description}`);
    }
  }
  if (cv.projects.length) {
    out.push(`\n## ${t.sections.projects}`);
    for (const pr of cv.projects) {
      out.push(`\n### ${pr.title}`);
      out.push(`URL: ${absoluteUrl(localizedPath(cv.lang, `/projects/${pr.slug}`))}`);
      if (pr.summary) out.push(`\n${pr.summary}`);
      if (pr.description) out.push(`\n${pr.description}`);
      const tech = list(pr.techStack);
      if (tech.length) out.push(`\n${t.md.tech}: ${tech.join(", ")}`);
      if (pr.repoUrl) out.push(`${t.md.repository}: ${pr.repoUrl}`);
      if (pr.liveUrl) out.push(`${t.md.live}: ${pr.liveUrl}`);
    }
  }
  if (cv.skills.length) {
    out.push(`\n## ${t.sections.skills}`);
    const byCat = new Map<string, string[]>();
    for (const s of cv.skills) {
      const cat = String(s.category || t.md.other);
      byCat.set(cat, [...(byCat.get(cat) ?? []), String(s.name)]);
    }
    for (const [cat, names] of byCat) out.push(`- ${cat}: ${names.join(", ")}`);
  }
  return out.join("\n") + "\n";
}

/** /llms.txt index following the llmstxt.org convention; lists the content in every language. */
export function toLlmsTxt(cv: PublicCv): string {
  const p = cv.profile ?? {};
  const lines = [`# ${cv.name || "CV"}`, ""];
  const summary = [p.tagline, p.location].filter(Boolean).join(" - ");
  if (summary) lines.push(`> ${summary}`, "");
  if (p.bio) lines.push(String(p.bio), "");

  lines.push("## Full CV (Markdown)", "");
  for (const l of LOCALES) {
    lines.push(`- [${LOCALE_NAMES[l]}](${absoluteUrl(`/llms-full.txt?lang=${l}`)}): everything on this site in one document`);
  }
  lines.push("", "## Data", "");
  for (const l of LOCALES) lines.push(`- [JSON (${LOCALE_NAMES[l]})](${absoluteUrl(`/api/cv.json?lang=${l}`)}): structured data`);
  for (const l of LOCALES) lines.push(`- [PDF (${LOCALE_NAMES[l]})](${absoluteUrl(`/api/cv?lang=${l}`)}): printable CV`);

  for (const l of LOCALES) {
    const t = getDictionary(l);
    const page = (path: string, label: string) => `- [${label}](${absoluteUrl(localizedPath(l, path))})`;
    lines.push("", `## Pages (${LOCALE_NAMES[l]})`, "");
    lines.push(page("/", t.nav.overview));
    if (cv.experience.length) lines.push(page("/experience", t.nav.experience));
    if (cv.education.length) lines.push(page("/education", t.nav.education));
    if (cv.projects.length) lines.push(page("/projects", t.nav.projects));
    if (cv.skills.length) lines.push(page("/skills", t.nav.skills));
    lines.push(page("/contact", t.nav.contact));
  }
  return lines.join("\n") + "\n";
}
