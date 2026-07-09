import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!rateLimit(`contact-info:${ip}`, 10, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const humanVerified = await verifyTurnstileToken(body?.turnstileToken, ip);
  if (!humanVerified) {
    return Response.json({ error: "Verification failed." }, { status: 400 });
  }

  const contact = await prisma.privateContact.findUnique({
    where: { id: 1 },
    select: { email: true, phone: true },
  });

  if (!contact) {
    return Response.json({ error: "Not available." }, { status: 404 });
  }

  return Response.json(contact);
}
