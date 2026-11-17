import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 4175)

export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.E2E_PORT ? `test-results/port-${port}` : 'test-results',
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
})
