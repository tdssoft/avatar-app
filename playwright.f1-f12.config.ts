import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["f1-f12-verification.spec.ts", "texts-verification.spec.ts", "p1-p3-verification.spec.ts"],
  timeout: 60_000,
  retries: 0,
  workers: 1,

  use: {
    baseURL: process.env.BASE_URL ?? "https://app.eavatar.diet",
    screenshot: "on",
    video: { mode: "on", size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-f1-f12-report" }],
  ],

  outputDir: "test-results/f1-f12",
});
