import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { rpID } from "@/lib/webauthn";
import {
  CHALLENGE_COOKIE,
  issueChallengeCookieValue,
  challengeCookieOptions,
} from "@/lib/webauthn-challenge";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(`admin-login:${getClientIp(request)}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const passkeys = await prisma.adminPasskey.findMany();

  if (passkeys.length === 0) {
    return Response.json({ error: "No admin passkey is registered yet." }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: (p.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    })),
  });

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, issueChallengeCookieValue(options.challenge), challengeCookieOptions());

  return Response.json(options);
}
