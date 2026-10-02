import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_UPLOAD_BYTES, processImage, sniffImageType, uploadDir } from "@/lib/uploads";

// Auth: covered by the /api/admin matcher in src/proxy.ts.
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
  if (!sniffImageType(buffer)) {
    return Response.json({ error: "Unsupported image format (use PNG, JPEG, WebP or GIF)." }, { status: 400 });
  }

  let processed;
  try {
    processed = await processImage(buffer);
  } catch {
    return Response.json({ error: "That image could not be read. Is the file corrupted?" }, { status: 400 });
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  await Promise.all([
    writeFile(path.join(dir, `${id}.webp`), processed.full),
    writeFile(path.join(dir, `${id}-thumb.webp`), processed.thumb),
  ]);

  return Response.json(
    {
      src: `/uploads/${id}.webp`,
      thumb: `/uploads/${id}-thumb.webp`,
      width: processed.width,
      height: processed.height,
    },
    { status: 201 },
  );
}
