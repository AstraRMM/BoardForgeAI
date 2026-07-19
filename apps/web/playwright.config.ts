import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: '../../tmp/playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.BOARDFORGE_E2E_BASE_URL || 'http://127.0.0.1:3212',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3212',
    url: 'http://127.0.0.1:3212',
    // Never attach tests to an arbitrary process on the E2E port: that process
    // might not have the development-only auth bypass or isolated distDir.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Must match the narrowly-scoped distDir switch in next.config.ts. This
      // lets Playwright run independently from a developer's active `.next`.
      BOARDFORGE_E2E_RUNTIME: '1',
      BOARDFORGE_E2E_AUTH_BYPASS: '1',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
