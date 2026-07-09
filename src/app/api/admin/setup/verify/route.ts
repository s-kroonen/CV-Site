import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { rpID, expectedOrigin } from "@/lib/webauthn";
import { isValidBootstrapToken } from "@/lib/bootstrap-token";
import { CHALLENGE_COOKIE, readChallenge } from "@/lib/webauthn-challenge";
import { ADMIN_SESSION_COOKIE, issueAdminSessionCookieValue, adminSessionCookieOptions } from "@/lib/admin-session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  const response = body?.response;

  if (!isValidBootstrapToken(token) || !response) {
    return Response.json({ error: "Invalid or expired setup link." }, { status: 401 });
  }

  const existingCount = await prisma.adminPasskey.count();
  if (existingCount > 0) {
    return Response.json({ error: "An admin passkey is already registered." }, { status: 409 });
  }

  const cookieStore = await cookies();
  const expectedChallenge = readChallenge(cookieStore.get(CHALLENGE_COOKIE)?.value);
  if (!expectedChallenge) {
    return Response.json({ error: "Setup session expired. Please reload and try again." }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
    });
  } catch {
    return Response.json({ error: "Passkey registration failed verification." }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return Response.json({ error: "Passkey registration failed verification." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  await prisma.adminPasskey.create({
    data: {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      transports: credential.transports ?? undefined,
    },
  });

  cookieStore.delete(CHALLENGE_COOKIE);
  cookieStore.set(ADMIN_SESSION_COOKIE, issueAdminSessionCookieValue(), adminSessionCookieOptions());

  return Response.json({ ok: true });
}
