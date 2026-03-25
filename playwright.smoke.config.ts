import { defineConfig, devices } from "@playwright/test";
import path from "path";

const authFile = path.resolve("tests/artifacts/auth/admin.json");

export default defineConfig({
  testDir: "./tests/e2e/smoke",
  globalSetup: "./tests/e2e/smoke/global-setup.ts",
  timeout: 90_000,
  retries: 1,
  workers: 1, // sequential — single logged-in session

  use: {
    baseURL: "http://localhost:5174",
    storageState: authFile,
    screenshot: "on",
    trace: "on",
    video: {
      mode: "on",
      size: { width: 1440, height: 900 },
    },
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-smoke-report" }],
  ],

  outputDir: "test-results/smoke",
  webServer: {
    command: "echo 'dev server expected to be running'",
    url: "http://localhost:5174",
    reuseExistingServer: true,
    timeout: 5_000,
  },
});
