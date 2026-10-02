import { buildExport, buildZip } from "@/lib/content-io";

// GET /api/admin/export?format=json|zip&private=1|0
// Full backup of site content (including archived/trashed items). The ZIP also
// carries uploaded images. Auth: covered by the /api/admin matcher in src/proxy.ts.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const zip = params.get("format") === "zip";
  const includePrivate = params.get("private") !== "0";
  const doc = await buildExport(includePrivate);
  const stamp = new Date().toISOString().slice(0, 10);

  if (zip) {
    const data = await buildZip(doc);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="cv-export-${stamp}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cv-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
