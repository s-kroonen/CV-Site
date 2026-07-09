import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, hashIp } from "@/lib/ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rate-limit";

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    message: z.string().trim().min(1).max(5000),
    website: z.string().max(0, "").optional().default(""), // honeypot - must stay empty
    turnstileToken: z.string().optional(),
  })
  .strict();

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(json);

  if (!parsed.success) {
    // A non-empty honeypot also lands here (max(0) fails) - respond identically
    // so bots can't distinguish "caught by honeypot" from "bad input".
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  const { name, email, message, turnstileToken } = parsed.data;

  const humanVerified = await verifyTurnstileToken(turnstileToken, ip);
  if (!humanVerified) {
    return Response.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  const ipHash = hashIp(ip);

  await prisma.contactMessage.create({
    data: { name, email, message, ipHash },
  });

  return Response.json({ ok: true });
}
