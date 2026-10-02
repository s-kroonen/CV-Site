import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile, getExperience, getEducation, getSkills } from "@/lib/data";
import { CvDocument } from "@/lib/cv-pdf";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

// GET /api/cv?lang=en|nl - the CV as a PDF in the requested language (default English).
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("lang");
  const lang = isLocale(param) ? param : DEFAULT_LOCALE;

  const [profile, experience, education, skills] = await Promise.all([
    getProfile(lang),
    getExperience(lang),
    getEducation(lang),
    getSkills(lang),
  ]);

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await renderToBuffer(
    <CvDocument lang={lang} profile={profile} experience={experience} education={education} skills={skills} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${profile.name.replace(/[^a-z0-9]+/gi, "-")}-CV-${lang}.pdf"`,
    },
  });
}
