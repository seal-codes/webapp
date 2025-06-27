import { defineConfig, devices } from '@playwright/test'

/**
 * Standalone Playwright config for testing GitHub PAT access
 * without dependencies on local server or auth setup
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'standalone-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1400 },
      },
    },
  ],
})
