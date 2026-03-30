import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    headless: true,
    video: "on",
    screenshot: "on",
  },
  outputDir: "tests/e2e/recordings",
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
