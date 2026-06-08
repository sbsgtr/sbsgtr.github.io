// playwright.config.js
// @ts-check

/** @type {import('playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:5500',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  // Auto-start dev server for local runs and CI
  webServer: {
    command: 'python3 dev_server.py --no-open',
    port: 5500,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },

  projects: [
    {
      name: 'Chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],
};

module.exports = config;

