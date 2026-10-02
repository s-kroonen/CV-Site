import { getPublicCv, toMarkdown } from "@/lib/public-cv";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(toMarkdown(await getPublicCv()), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=900" },
  });
}
