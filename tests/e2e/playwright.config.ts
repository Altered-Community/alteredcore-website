import { defineConfig, devices } from '@playwright/test';

/**
 * Shell and plugin end-to-end tests, run against the full stack (docker-compose.stack.yml):
 *   tests/e2e/*.spec.ts           the shell (routing, host contract, session token)
 *   plugins/<id>/e2e/*.spec.ts    each plugin, discovered by convention
 * Plugin specs import `test` / `expect` from tests/e2e/fixtures.ts (one Playwright install).
 *
 * E2E_BASE_URL (default http://localhost:8080) · E2E_EVIDENCE_DIR: named screenshots for review.
 */
export default defineConfig({
  testDir: '../..',
  testMatch: ['tests/e2e/**/*.spec.ts', 'plugins/*/e2e/**/*.spec.ts'],
  // .claude/worktrees: other checkouts of the repo (agent worktrees), with their own specs.
  testIgnore: ['**/node_modules/**', '**/.claude/**'],
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: process.env['CI'] ? 2 : 3,
  retries: process.env['CI'] ? 1 : 0,
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI']
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }], ['github']]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
    },
  ],
});
