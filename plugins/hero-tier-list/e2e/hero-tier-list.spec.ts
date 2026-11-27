import { evidence, expect, test, type Page } from '../../../tests/e2e/fixtures';

/**
 * Hero tier list (plugin `hero-tier-list`, /pages/hero-tier-list): heroes from the production cards API, full arts
 * from the CDN, ranking kept in localStorage. Playwright locators pierce the open shadow root.
 */

/** In French: the site's language is a session setting (`?lang=`). */
const PAGE = '/pages/hero-tier-list?lang=fr';

async function open(page: Page): Promise<void> {
  await page.goto(PAGE);
  await expect(page.getByRole('heading', { name: 'Tier list des héros' })).toBeVisible();
  await expect(pool(page).locator('ac-hero-tile').first()).toBeVisible();
}

const pool = (page: Page) => page.getByRole('group', { name: 'Héros à classer' });
const tier = (page: Page, name: string) => page.getByRole('group', { name, exact: true });

/** Drags with the mouse in small steps, as a person would: CDK needs moves past its threshold. */
async function drag(page: Page, from: ReturnType<Page['locator']>, to: ReturnType<Page['locator']>, toEdge: 'start' | 'end' = 'end'): Promise<void> {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 4 });
  const x = toEdge === 'start' ? b.x + 8 : b.x + b.width - 8;
  await page.mouse.move(x, b.y + b.height / 2, { steps: 15 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test.describe('hero tier list', () => {
  test('is in the « Communauté & Aide » menu', async ({ page, compact }) => {
    test.skip(compact, 'the desktop menu');
    await page.goto('/pages/index?lang=fr');
    await page.getByRole('link', { name: 'Communauté & Aide' }).first().click();
    await expect(page.getByRole('link', { name: 'Tier list des héros' })).toHaveAttribute('href', /\/pages\/hero-tier-list$/);
  });

  test('ranks, reorders and unranks heroes by drag and drop', async ({ page, compact }, testInfo) => {
    test.skip(compact, 'mouse drag; touch is covered by the tap test');
    await open(page);
    const first = pool(page).getByRole('button').first();
    const firstName = (await first.getAttribute('aria-label'))!;
    await drag(page, first, tier(page, 'S'));
    await expect(tier(page, 'S').getByRole('button', { name: firstName })).toBeVisible();

    const second = pool(page).getByRole('button').first();
    const secondName = (await second.getAttribute('aria-label'))!;
    await drag(page, second, tier(page, 'S'));
    await expect(tier(page, 'S').getByRole('button')).toHaveCount(2);
    const names = () => tier(page, 'S').getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(await names()).toEqual([firstName, secondName]);

    // Reorder inside the tier: the second hero before the first.
    await drag(page, tier(page, 'S').getByRole('button', { name: secondName }), tier(page, 'S').getByRole('button', { name: firstName }), 'start');
    await expect.poll(names).toEqual([secondName, firstName]);
    await evidence(page, testInfo, 'hero-tier-list-ranked');

    // Kept after a reload.
    await page.reload();
    await expect.poll(names).toEqual([secondName, firstName]);

    // Back to the pool, then undo.
    await drag(page, tier(page, 'S').getByRole('button', { name: firstName }), pool(page));
    await expect.poll(names).toEqual([secondName]);
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect.poll(names).toEqual([secondName, firstName]);
  });

  test('places a hero with a tap then its tier @mobile', async ({ page }) => {
    await open(page);
    const hero = pool(page).getByRole('button').first();
    const name = (await hero.getAttribute('aria-label'))!;
    await hero.click();
    const bar = page.getByRole('region', { name: 'Placer le héros' });
    await expect(bar).toContainText(name);
    await bar.getByRole('button', { name: 'A', exact: true }).click();
    await expect(bar).toBeHidden();
    await expect(tier(page, 'A').getByRole('button', { name })).toBeVisible();
  });

  test('drags a hero with a long press on a touch screen @mobile', async ({ page, compact }) => {
    test.skip(!compact, 'touch');
    await open(page);
    const hero = pool(page).getByRole('button').first();
    const name = (await hero.getAttribute('aria-label'))!;
    await hero.scrollIntoViewIfNeeded();
    const a = (await hero.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const x0 = a.x + a.width / 2;
    const y0 = a.y + a.height / 2;
    await touch('touchStart', x0, y0);
    await page.waitForTimeout(350);
    // Up the screen, to the auto-scroll edge, until tier S is under the finger.
    let y = y0;
    for (let i = 0; i < 400; i++) {
      const s = (await tier(page, 'S').boundingBox())!;
      if (s.y + s.height / 2 > 120 && s.y + s.height / 2 < 700) {
        y = s.y + s.height / 2;
        await touch('touchMove', s.x + s.width - 20, y);
        break;
      }
      y = Math.max(90, y - 40);
      await touch('touchMove', x0, y);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(200);
    const s = (await tier(page, 'S').boundingBox())!;
    await touch('touchMove', s.x + s.width - 20, s.y + s.height / 2);
    await page.waitForTimeout(200);
    await touch('touchEnd', 0, 0);
    await expect(tier(page, 'S').getByRole('button', { name })).toBeVisible();
    // A drag is not a tap: no action bar.
    await expect(page.getByRole('region', { name: 'Placer le héros' })).toBeHidden();
  });

  test('the dragged art stays under the pointer, at the spot it was taken by', async ({ page, compact }) => {
    test.skip(compact, 'mouse');
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 200));
    const hero = pool(page).getByRole('button').nth(4);
    const b = (await hero.boundingBox())!;
    await page.mouse.move(b.x + 20, b.y + 30);
    await page.mouse.down();
    // A quick gesture: the first move is already far from the press.
    await page.mouse.move(400, 400, { steps: 3 });
    const preview = (await page.locator('.ac-hero-drag-preview').boundingBox())!;
    const grab = { x: 400 - preview.x, y: 400 - preview.y };
    // 20 / 30 px into the tile, give or take the tilt and the 8 % enlargement.
    expect(Math.abs(grab.x - 20)).toBeLessThan(12);
    expect(Math.abs(grab.y - 30)).toBeLessThan(12);
    await page.mouse.up();
  });

  test('a drag released in place is not a tap', async ({ page, compact }) => {
    test.skip(compact, 'mouse');
    await open(page);
    const hero = pool(page).getByRole('button').first();
    const b = (await hero.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 30, b.y + b.height / 2, { steps: 5 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await expect(page.getByRole('region', { name: 'Placer le héros' })).toBeHidden();
  });

  test('edits the tiers', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Modifier les tiers' }).click();
    // A blank name is not taken: the field shows the name kept.
    await page.getByRole('textbox', { name: 'Nom du tier' }).first().fill('');
    await page.getByRole('textbox', { name: 'Nom du tier' }).first().press('Enter');
    await expect(page.getByRole('textbox', { name: 'Nom du tier' }).first()).toHaveValue('S');
    await page.getByRole('textbox', { name: 'Nom du tier' }).first().fill('Top');
    await page.getByRole('textbox', { name: 'Nom du tier' }).first().press('Enter');
    await page.getByRole('button', { name: 'Ajouter un tier' }).click();
    await page.getByRole('button', { name: 'Terminer' }).click();
    await expect(tier(page, 'Top')).toBeVisible();
    await expect(tier(page, 'Nouveau')).toBeVisible();
  });

  test('exports the ranking as a PNG', async ({ page }) => {
    await open(page);
    await pool(page).getByRole('button').first().click();
    await page.getByRole('region', { name: 'Placer le héros' }).getByRole('button', { name: 'S', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter en PNG' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('tier-list-des-heros.png');
    const bytes = await (await file.createReadStream()).toArray();
    const png = Buffer.concat(bytes);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.length).toBeGreaterThan(20_000);
  });
});
