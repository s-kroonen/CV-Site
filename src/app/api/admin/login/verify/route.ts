import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { rpID, expectedOrigin } from "@/lib/webauthn";
import { CHALLENGE_COOKIE, readChallenge } from "@/lib/webauthn-challenge";
import { ADMIN_SESSION_COOKIE, issueAdminSessionCookieValue, adminSessionCookieOptions } from "@/lib/admin-session";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(`admin-login:${getClientIp(request)}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const response = body?.response;

  if (!response?.id) {
    return Response.json({ error: "Invalid login attempt." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const expectedChallenge = readChallenge(cookieStore.get(CHALLENGE_COOKIE)?.value);
  if (!expectedChallenge) {
    return Response.json({ error: "Login session expired. Please try again." }, { status: 401 });
  }

  const passkey = await prisma.adminPasskey.findUnique({ where: { credentialId: response.id } });
  if (!passkey) {
    return Response.json({ error: "Unrecognized passkey." }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64")),
        counter: passkey.counter,
      },
    });
  } catch {
    return Response.json({ error: "Login failed verification." }, { status: 400 });
  }

  if (!verification.verified) {
    return Response.json({ error: "Login failed verification." }, { status: 400 });
  }

  await prisma.adminPasskey.update({
    where: { id: passkey.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  cookieStore.delete(CHALLENGE_COOKIE);
  cookieStore.set(ADMIN_SESSION_COOKIE, issueAdminSessionCookieValue(), adminSessionCookieOptions());

  return Response.json({ ok: true });
}
