import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { getPublicCv, toMarkdown } from "@/lib/public-cv";

export const dynamic = "force-dynamic";

// GET /llms-full.txt?lang=en|nl - the whole CV as Markdown (default English).
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("lang");
  const lang = isLocale(param) ? param : DEFAULT_LOCALE;
  return new Response(toMarkdown(await getPublicCv(lang)), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Language": lang, "Cache-Control": "public, max-age=900" },
  });
}
