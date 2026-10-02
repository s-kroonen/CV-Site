import {
  MAX_IMPORT_BYTES,
  applyImport,
  parseImportFile,
  planImport,
  prepareImport,
  type ImportMode,
} from "@/lib/content-io";

// POST multipart: file, mode=add|replace, includeProfile=1|0, dryRun=1|0
// dryRun validates and reports what would change; a real run refuses to touch
// anything while the file has validation errors. Auth: /api/admin matcher in src/proxy.ts.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose an export file (.json or .zip)." }, { status: 400 });
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return Response.json({ error: "File is too large (30MB max)." }, { status: 400 });
  }

  const mode: ImportMode = form?.get("mode") === "replace" ? "replace" : "add";
  const includeProfile = form?.get("includeProfile") === "1";
  const dryRun = form?.get("dryRun") !== "0";

  let parsed;
  try {
    parsed = parseImportFile(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch (err) {
    const message = err instanceof SyntaxError ? "That file isn't valid JSON." : err instanceof Error ? err.message : "Could not read the file.";
    return Response.json({ error: message }, { status: 400 });
  }

  const prepared = prepareImport(parsed.doc, parsed.uploads);
  const { summary } = await planImport(prepared, mode, includeProfile);
  const report = {
    mode,
    summary,
    errors: prepared.errors.slice(0, 50),
    errorCount: prepared.errors.length,
    uploads: { found: prepared.uploads.found, missing: prepared.uploads.missing.length },
    hasPrivateContact: !!prepared.privateContact,
  };

  if (dryRun) return Response.json({ ...report, applied: false });
  if (prepared.errors.length) {
    return Response.json({ ...report, applied: false, error: "Fix the errors in the file first - nothing was imported." }, { status: 422 });
  }

  await applyImport(prepared, parsed.uploads, mode, includeProfile);
  return Response.json({ ...report, applied: true });
}
