import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env");
} catch {
  // CI provides env vars directly.
}

// E2E tests change data. Run `npm run db:reset` before `npm run test:e2e`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  // channel "chromium" = the full Chromium build in new headless mode (no separate headless-shell download).
  // PW_CHANNEL=msedge uses the system Edge instead, when the Chromium download isn't available.
  use: { baseURL: "http://localhost:3000", channel: process.env.PW_CHANNEL ?? "chromium" },
  webServer: { command: "npm run dev", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 120_000 },
});
