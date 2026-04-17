/**
 * Playwright config for UAT recording sessions.
 *
 * Usage:
 *   PO  (local fixes):   npx playwright test --config playwright.record.config.ts
 *   PRZED (production):  BASE_URL=https://app.eavatar.diet npx playwright test --config playwright.record.config.ts
 */
import { defineConfig } from "@playwright/test";
import path from "path";

const authFile = path.resolve("tests/artifacts/auth/admin.json");

export default defineConfig({
  testDir: "./tests/e2e/recordings",
  globalSetup: "./tests/e2e/recordings/global-setup.ts",
  timeout: 180_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5174",
    storageState: authFile,
    screenshot: "on",
    trace: "on",
    video: { mode: "on", size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      slowMo: 250,
    },
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-uat-report" }],
  ],
  outputDir: process.env.RECORD_ENV === "przed"
    ? "test-results/recordings-przed"
    : "test-results/recordings-po",
});
