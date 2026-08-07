import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/stage2',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  outputDir: '../output/playwright/stage2/results',
  reporter: [['line'], ['html', { outputFolder: '../output/playwright/stage2/report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3102',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm exec next dev -p 3102',
    url: 'http://127.0.0.1:3102/exercises-manage',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
