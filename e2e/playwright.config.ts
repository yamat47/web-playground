import { defineConfig, devices } from '@playwright/test'

// Smoke tests against the assembled dist/, served with the same URL rules as
// production (tools/serve.ts). Run `pnpm build` first.
const port = 4173

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  retries: process.env['CI'] !== undefined ? 1 : 0,
  reporter: process.env['CI'] !== undefined ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `node ../tools/serve.ts ../dist --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 10_000,
  },
})
