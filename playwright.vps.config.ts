import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: "http://127.0.0.1",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  // No webServer - Nginx is serving the app
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1024 },
        storageState: "tests/artifacts/auth/admin.json",
      },
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/smoke/global-setup.ts",
});
