import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/stage5',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  outputDir: '../output/playwright/stage5/results',
  reporter: [
    ['line'],
    [
      'html',
      {
        outputFolder: '../output/playwright/stage5/report',
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:3105',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm exec next dev -p 3105',
    url: 'http://127.0.0.1:3105/profile',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
