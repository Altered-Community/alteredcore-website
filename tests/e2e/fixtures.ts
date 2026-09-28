import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export { expect };
export type { Page };

/** Keycloak users of docker/stack/players-realm.json. */
export const USERS = {
  alice: { username: 'alice', password: 'TestPassword1234', pseudo: 'Alice' },
  bob: { username: 'bob', password: 'TestPassword1234', pseudo: 'Bob' },
} as const;


export const test = base.extend<{ compact: boolean }>({
  // The cookie banner (Bootstrap modal) would cover the page on the first visit.
  context: async ({ context, baseURL }, use) => {
    await context.addCookies([{ name: 'alteredcore_consent', value: '1', url: baseURL! }]);
    await use(context);
  },
  compact: async ({ viewport }, use) => {
    await use((viewport?.width ?? 1440) < 768);
  },
});

/** Signs in through the site's Keycloak login (auth-code flow, server-side token exchange). */
export async function login(page: Page, user: keyof typeof USERS = 'alice', returnTo = '/pages/index'): Promise<void> {
  const { username, password } = USERS[user];
  await page.goto(`/auth/keycloak-login?return=${encodeURIComponent(returnTo)}`);
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => !url.pathname.includes('/realms/') && !url.pathname.includes('/auth/'));
}

/** CSRF token of the current page (window.AlteredCore on SPA pages). */
export async function csrfOf(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as { AlteredCore: { csrf: string } }).AlteredCore.csrf);
}

/**
 * Named screenshot, attached to the report and, with E2E_EVIDENCE_DIR, written as
 * `<dir>/<project>-<name>.png` so reviewers get stable file names.
 */
export async function evidence(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  // Card art loads lazily and fades in: capture the settled page.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(400);
  const body = await page.screenshot({ fullPage: false });
  await testInfo.attach(name, { body, contentType: 'image/png' });
  const dir = process.env['E2E_EVIDENCE_DIR'];
  if (dir) {
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, `${testInfo.project.name}-${name}.png`), fullPage: false });
  }
}
