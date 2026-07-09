import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_UPLOAD_BYTES, sniffImageType, uploadDir } from "@/lib/uploads";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "File is empty or exceeds the 5MB limit." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = sniffImageType(buffer);
  if (!detected) {
    return Response.json({ error: "Unsupported or unrecognized image format." }, { status: 400 });
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${detected.ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return Response.json({ path: `/uploads/${filename}` }, { status: 201 });
}
