import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Tests intercept randomuser.me and serve the repo's existing `MockResult` fixture
 * (src/app/mock-data.ts — already used by UsersServiceStub for unit tests) instead of hitting the
 * real API, so the suite is fast, deterministic, and independent of an external service's
 * uptime/rate limits. See README's Testing section for how to run this and a note on this
 * environment's own limitations verifying it.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
