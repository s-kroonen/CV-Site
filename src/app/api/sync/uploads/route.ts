import { authorizeSync, listUploads } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = authorizeSync(request);
  if (denied) return denied;
  return Response.json(await listUploads());
}
