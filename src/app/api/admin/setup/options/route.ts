import { cookies } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { rpID, rpName } from "@/lib/webauthn";
import { isValidBootstrapToken } from "@/lib/bootstrap-token";
import {
  CHALLENGE_COOKIE,
  issueChallengeCookieValue,
  challengeCookieOptions,
} from "@/lib/webauthn-challenge";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({ token: null }));

  if (!isValidBootstrapToken(token)) {
    return Response.json({ error: "Invalid or expired setup link." }, { status: 401 });
  }

  const existingCount = await prisma.adminPasskey.count();
  if (existingCount > 0) {
    return Response.json({ error: "An admin passkey is already registered." }, { status: 409 });
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpID(),
    userName: "admin",
    userDisplayName: "Admin",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, issueChallengeCookieValue(options.challenge), challengeCookieOptions());

  return Response.json(options);
}
