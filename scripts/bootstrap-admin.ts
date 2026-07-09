import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { issueBootstrapToken } from "../src/lib/bootstrap-token";

async function main() {
  const existingCount = await prisma.adminPasskey.count();
  if (existingCount > 0) {
    console.error(
      `An admin passkey is already registered (${existingCount} on file). ` +
        "Refusing to issue a new setup link - this bootstrap flow is for first-time setup only.",
    );
    process.exit(1);
  }

  const token = issueBootstrapToken();
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const url = `${siteUrl}/admin/setup?token=${token}`;

  console.log("\nOpen this URL in a browser on the device you want to register as admin.");
  console.log("It expires in 15 minutes and can only be used once (until a passkey exists).\n");
  console.log(url);
  console.log();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
