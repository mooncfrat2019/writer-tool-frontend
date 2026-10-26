import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-real',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-real',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev --mode real',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
