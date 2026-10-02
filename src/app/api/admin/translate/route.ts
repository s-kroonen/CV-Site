import { z } from "zod";
import { isLocale } from "@/lib/i18n/config";
import { TranslateError, translationProvider } from "@/lib/translate";
import { TRANSLATABLE, autoTranslateFields, isTEntity, sanitizeFields } from "@/lib/translations";

// Auth: covered by the /api/admin matcher in src/proxy.ts.

/** Whether a translation service is configured (the admin form shows its Translate button accordingly). */
export async function GET() {
  return Response.json({ available: translationProvider() !== null, provider: translationProvider() });
}

const schema = z.object({
  entity: z.string(),
  from: z.string(),
  to: z.string(),
  fields: z.record(z.string(), z.unknown()),
});

/** Machine-translates the given source fields; nothing is saved (the form stores the result on Save). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isTEntity(parsed.data.entity) || !isLocale(parsed.data.from) || !isLocale(parsed.data.to)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { entity, from, to, fields } = parsed.data;
  if (from === to) return Response.json({ error: "Source and target language are the same." }, { status: 400 });
  if (!translationProvider()) {
    return Response.json({ error: "No translation service is configured on the server." }, { status: 501 });
  }
  try {
    const source = sanitizeFields(entity, fields);
    return Response.json({ fields: await autoTranslateFields(entity, source, from, to), specs: TRANSLATABLE[entity] });
  } catch (err) {
    return Response.json(
      { error: err instanceof TranslateError ? err.message : "Translation failed." },
      { status: 502 },
    );
  }
}
