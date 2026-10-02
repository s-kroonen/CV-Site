import { getPublicCv, toLlmsTxt } from "@/lib/public-cv";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(toLlmsTxt(await getPublicCv()), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=900" },
  });
}
