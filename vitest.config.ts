import { defineConfig } from "vitest/config";
import os from "node:os";
import path from "node:path";

// Database-backed tests run against a throwaway SQLite file that src/test/global-setup.ts
// creates by applying the real migrations (so migrations are tested too). Never touches dev.db.
const dir = path.join(os.tmpdir(), "cv-site-vitest").split(path.sep).join("/");

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    // One shared database file: run test files one after another.
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${dir}/test.db`,
      UPLOAD_DIR: `${dir}/uploads`,
      SESSION_SECRET: "vitest-secret",
      SITE_URL: "https://example.test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
