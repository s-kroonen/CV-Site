import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile, getExperience, getEducation, getSkills } from "@/lib/data";
import { CvDocument } from "@/lib/cv-pdf";

export async function GET() {
  const [profile, experience, education, skills] = await Promise.all([
    getProfile(),
    getExperience(),
    getEducation(),
    getSkills(),
  ]);

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await renderToBuffer(
    <CvDocument profile={profile} experience={experience} education={education} skills={skills} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${profile.name.replace(/[^a-z0-9]+/gi, "-")}-CV.pdf"`,
    },
  });
}
