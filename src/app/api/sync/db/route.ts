import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { authorizeSync, createSnapshot, removeFile } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** A consistent copy of the database. The checksum header lets the replica verify what it received. */
export async function GET(request: Request) {
  const denied = authorizeSync(request);
  if (denied) return denied;
  const snapshot = await createSnapshot();
  const stream = createReadStream(snapshot.file);
  stream.on("close", () => void removeFile(snapshot.file));
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(snapshot.size),
      "X-Snapshot-Sha256": snapshot.sha256,
      "Cache-Control": "no-store",
    },
  });
}
