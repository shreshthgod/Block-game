import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', {
    open: 'never'
  }]],
  use: {
    baseURL: process.env.PRISM_URL || 'http://127.0.0.1:4173',
    viewport: {
      width: 390,
      height: 844
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: process.env.PRISM_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  }
});
