/** Path of the SQLite file named by DATABASE_URL ("file:/data/db/prod.db"). Dependency-free so the proxy can use it too. */
export function dbFilePath(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (url === ":memory:") return url;
  if (!url.startsWith("file:")) {
    throw new Error(`DATABASE_URL must start with "file:", got: ${url}`);
  }
  return url.slice("file:".length);
}
