import { defineConfig } from "vitest/config";
import path from "node:path";

try {
  process.loadEnvFile(".env");
} catch {
  // CI provides env vars directly.
}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests share one seeded database.
    fileParallelism: false,
  },
});
