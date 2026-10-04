export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { syncConfigured } = await import("@/lib/site-role");
  if (!syncConfigured()) return;
  const { startSyncEngine } = await import("@/lib/sync-engine");
  startSyncEngine();
}
