import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL   = process.env.SMOKE_BASE_URL  ?? 'http://127.0.0.1:5174';
const outputDir = process.env.SMOKE_OUTPUT_DIR ?? 'tests/artifacts/smoke-after';
const authFile  = path.resolve('tests/artifacts/auth/admin.json');

export default defineConfig({
  testDir: './tests/e2e/smoke',
  timeout: 180_000,
  retries: 0,

  // Zaloguj się raz przed wszystkimi testami
  globalSetup: './tests/e2e/smoke/global-setup.ts',

  use: {
    baseURL,
    // Każdy test startuje z już zapisaną sesją admina
    storageState: authFile,
    screenshot: 'on',
    trace: 'on',
    video: { mode: 'on', size: { width: 1440, height: 900 } },
  },
  outputDir,
  projects: [
    {
      name: 'chromium-smoke',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          slowMo: 100,
          args: ['--disable-web-security'],
        },
      },
    },
  ],
  reporter: [['list']],
});
