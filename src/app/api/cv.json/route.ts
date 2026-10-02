import { getPublicCv } from "@/lib/public-cv";

export const dynamic = "force-dynamic";

// Public, read-only structured copy of the CV (active items only, no private contact details).
export async function GET() {
  return Response.json(await getPublicCv(), {
    headers: { "Cache-Control": "public, max-age=900", "Access-Control-Allow-Origin": "*" },
  });
}
