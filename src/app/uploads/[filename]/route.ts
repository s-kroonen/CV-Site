import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/uploads";

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // Reject anything that isn't a bare "<uuid>.<ext>" - no path traversal.
  if (!/^[a-f0-9-]+\.(png|jpg|webp|gif)$/i.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = filename.split(".").pop()!.toLowerCase();
  const filePath = path.join(uploadDir(), filename);

  try {
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": EXT_MIME[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
