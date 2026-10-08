import { expect, login, setBeta, test, type Page } from '../../../tests/e2e/fixtures';
import { emptyCache, loadingProblems, loadingReport, throttle, watchLoading } from '../../../tests/e2e/loading';
import budgets from './loading-budgets.json';
import { createServerDeck } from './decks';
import { FORBIDDEN_TEXTS, SCREENS } from './screens';

/**
 * Loading of every Re:Builder screen on a slow phone network (tests/e2e/loading.ts), first and second visit: the
 * server's skeleton stays until the app draws its first screen, the app never shows unstyled, the skeleton keeps the
 * site's font, no « Chargement… » title, and the layout shifts (CLS) stay within the screen's budget
 * (loading-budgets.json: 0.01, or today's value for a known shift). A failure prints what moved or showed;
 * `node tests/e2e/loading-timeline.ts <screen>` shows it frame by frame.
 */
type Budgets = { default: number; screens: Record<string, { max: number; why: string }> };

/** Waits until the page is done: placeholder gone, network quiet (bounded: card art keeps coming on a slow network). */
async function settle(page: Page): Promise<void> {
  await expect(page.locator('.ac-spa-placeholder')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
}

test.beforeEach(async ({ page }) => setBeta(page, true));

test.describe('ReBuilder in the shell · loading on a slow phone network', () => {
  for (const screen of SCREENS) {
    for (const visit of ['first', 'second'] as const) {
      test(`${screen.name}, ${visit} visit: skeleton until the first screen, styled, no layout shift`, { tag: '@mobile' }, async ({ page }, testInfo) => {
        await login(page, 'alice', '/pages/decks?lang=fr');
        const id = screen.deck ? await createServerDeck(page, `E2E loading ${Date.now()}`) : '';
        const path = screen.path(id);
        const url = `${path}${path.includes('?') ? '&' : '?'}lang=fr`;
        if (visit === 'second') {
          await page.goto(url);
          await settle(page);
        } else {
          await emptyCache(page);
        }
        await watchLoading(page, FORBIDDEN_TEXTS);
        await throttle(page, 'phone');
        await page.goto(url);
        await settle(page);

        const report = await loadingReport(page);
        const budget = (budgets as Budgets).screens[`${testInfo.project.name}/${screen.key}/${visit}`];
        await testInfo.attach('loading-report', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
        if (budget) testInfo.annotations.push({ type: 'known shift', description: `CLS ${report.cls} (budget ${budget.max}): ${budget.why}` });
        expect(loadingProblems(report, budget?.max ?? (budgets as Budgets).default), `CLS ${report.cls}`).toEqual([]);
      });
    }
  }
});
