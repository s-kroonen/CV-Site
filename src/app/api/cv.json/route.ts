import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { getPublicCv } from "@/lib/public-cv";

export const dynamic = "force-dynamic";

// Public, read-only structured copy of the CV (active items only, no private contact details).
// GET /api/cv.json?lang=en|nl
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("lang");
  const lang = isLocale(param) ? param : DEFAULT_LOCALE;
  return Response.json(await getPublicCv(lang), {
    headers: { "Content-Language": lang, "Cache-Control": "public, max-age=900", "Access-Control-Allow-Origin": "*" },
  });
}
