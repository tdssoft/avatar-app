import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:8080",
    video: { mode: "on", size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
    screenshot: "on",
    launchOptions: { slowMo: 300 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results/ai-demo",
});
