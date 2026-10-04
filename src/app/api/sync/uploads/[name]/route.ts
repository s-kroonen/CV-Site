import { readFile } from "node:fs/promises";
import path from "node:path";
import { authorizeSync, UPLOAD_NAME } from "@/lib/sync";
import { uploadDir } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const denied = authorizeSync(request);
  if (denied) return denied;
  const { name } = await params;
  if (!UPLOAD_NAME.test(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(uploadDir(), name));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
