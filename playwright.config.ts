import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests require the Next.js server running against onelytics_test DB.
 *
 * Start the server before running:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/onelytics_test" npm start
 *
 * Then run:
 *   npx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,   // sequential — tests share the same DB
  workers: 1,
  retries: 0,
  timeout: 30_000,
  globalSetup:    './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
