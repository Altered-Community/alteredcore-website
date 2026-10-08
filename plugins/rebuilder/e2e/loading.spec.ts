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
 * `node tests/e2e/loading-timeline.ts <screen>` shows it frame by frame. On the desktop project, a second visit at
 * 1280 and 1024 px too: laptop and tablet widths, where the deck bar and the editor change their layout
 * (`npm run loading:matrix` for every size).
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
  const runs = [{ visit: 'first' }, { visit: 'second' }, { visit: 'second', width: 1280 }, { visit: 'second', width: 1024 }] as const;
  for (const screen of SCREENS) {
    for (const run of runs) {
      const { visit } = run;
      const width = 'width' in run ? run.width : null;
      test(`${screen.name}, ${visit} visit${width ? ` at ${width} px` : ''}: skeleton until the first screen, styled, no layout shift`, { tag: width ? [] : '@mobile' }, async ({ page }, testInfo) => {
        test.skip(width !== null && testInfo.project.name !== 'desktop', 'the desktop project only');
        if (width) await page.setViewportSize({ width, height: 800 });
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
        const budget = (budgets as Budgets).screens[`${testInfo.project.name}${width ? `@${width}` : ''}/${screen.key}/${visit}`];
        await testInfo.attach('loading-report', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
        if (budget) testInfo.annotations.push({ type: 'known shift', description: `CLS ${report.cls} (budget ${budget.max}): ${budget.why}` });
        expect(loadingProblems(report, budget?.max ?? (budgets as Budgets).default), `CLS ${report.cls}`).toEqual([]);
      });
    }
  }
});
