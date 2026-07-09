import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function dbFilePath(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (url === ":memory:") return url;
  if (!url.startsWith("file:")) {
    throw new Error(`DATABASE_URL must start with "file:", got: ${url}`);
  }
  return url.slice("file:".length);
}

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: dbFilePath() });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Lazy by design: Next's build-time page-data-collection step imports every
// route module (even ones that are fully dynamic at runtime) just to inspect
// their exports, without a real request or DATABASE_URL available (e.g. the
// Docker builder stage deliberately has no .env). Eagerly constructing the
// client here would fail that step. A Proxy defers construction to first
// actual use, which only happens at request time.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = (globalForPrisma.prisma ??= createClient());
    return Reflect.get(client as object, prop, receiver);
  },
});
