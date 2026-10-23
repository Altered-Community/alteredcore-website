// Hidden creatures: a creature on its page, a click that counts (server side when signed in), a spot that only counts
// once its page was shown, the event and link triggers. Runs against the test spots of fixtures.php (the real ones live
// in the admin), created by the stack when the plugin is active (AC_ACTIVATE_PLUGINS="… hidden-creatures"): skipped
// otherwise. The CI's stack leaves it off: a creature falling over the other specs would catch their clicks.
import { createServerDeck } from '../../rebuilder/e2e/decks';
import { evidence, expect, login, setBeta, test, type Page } from '../../../tests/e2e/fixtures';

/** Test spots (fixtures.php): their pages and triggers. */
const LOAD_PAGE = '/pages/news?lang=fr'; // e2e-load, code E2E-CODE
const EVENT_PAGE = '/pages/privacy?lang=fr'; // e2e-event: event « e2e »; e2e-link: link to https://example.test
const FIND = '/papi/hidden-creatures/find';
const NAME = 'Créature E2E';

type Config = { spots: { id: string }[]; all: string[]; csrf: string };

/** Skips the test when the plugin or its test spots are missing on this stack. */
async function skipWithoutFixtures(page: Page): Promise<void> {
  const all = await page.evaluate(() => (window as unknown as { acHiddenCreatures?: Config }).acHiddenCreatures?.all ?? []);
  test.skip(!all.includes('e2e-load'), 'hidden-creatures or its e2e fixtures are not on this stack');
}

/** The creature of the page: an <img> in <cotton-fall>'s shadow DOM. Clicked by event, it never stops moving. */
const creature = (page: Page) => page.locator('cotton-fall img.ball');

type Reply = { code: string | null; new?: boolean; found?: string[] };

async function clickCreature(page: Page): Promise<Reply> {
  const reply = page.waitForResponse((res) => res.url().endsWith(FIND));
  await creature(page).first().dispatchEvent('click');
  const res = await reply;
  expect(res.status()).toBe(200);
  return (await res.json()) as Reply;
}

test('a visitor finds a creature, counted in their browser, with the spot\'s code', async ({ page }, testInfo) => {
  await page.goto(LOAD_PAGE);
  await skipWithoutFixtures(page);
  await expect(creature(page)).toHaveCount(1);
  const normal = await creature(page).getAttribute('src');

  const reply = await clickCreature(page);
  expect(reply).toEqual({ code: 'E2E-CODE' });
  const toast = page.locator('.ac-toast');
  await expect(toast).toContainText(new RegExp(`^Trouvé : ${NAME} ! 1/\\d+ · Code : E2E-CODE Connecte-toi`));
  await expect(toast.getByRole('button', { name: 'Copier' })).toBeVisible();
  // The clicked image (here the cotton ball's own).
  await expect(creature(page)).not.toHaveAttribute('src', normal!);
  await evidence(page, testInfo, 'hidden-creatures-found');

  // Again on the next visit: already found, same count.
  await page.reload();
  await clickCreature(page);
  await expect(toast).toContainText(new RegExp(`^${NAME}, déjà trouvé \\(1/\\d+\\)`));
});

test('a spot only counts once its page was shown', async ({ page }) => {
  await page.goto(LOAD_PAGE);
  await skipWithoutFixtures(page);
  const status = await page.evaluate(async (url) => {
    const { csrf } = (window as unknown as { acHiddenCreatures: Config }).acHiddenCreatures;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ spot: 'e2e-test-hand' }),
    });
    return res.status;
  }, FIND);
  expect(status).toBe(409);
});

test('an event spot: the creature crosses the screen when the page sends the event', async ({ page }) => {
  await page.goto(EVENT_PAGE);
  await skipWithoutFixtures(page);
  await expect(creature(page)).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ac-hidden-spot', { detail: 'e2e' })));
  await expect(creature(page)).toHaveCount(1);
});

test('a link spot: the creature is there when the visitor comes back from the site', async ({ page, context }) => {
  await context.route('https://example.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>Elsewhere</p>' }));
  await page.goto(EVENT_PAGE);
  await skipWithoutFixtures(page);
  const addLink = (target: string) => page.evaluate((t) => {
    const a = Object.assign(document.createElement('a'), { href: 'https://example.test/', textContent: 'Elsewhere', target: t });
    a.id = 'e2e-link';
    document.body.append(a);
  }, target);

  // Same tab: on the site again, back from the other one.
  await addLink('');
  await page.locator('#e2e-link').dispatchEvent('click');
  await page.waitForURL('https://example.test/');
  await page.goBack();
  await expect(creature(page)).toHaveCount(1);
  // Released once: not on the next page.
  await page.goto(EVENT_PAGE);
  await expect(creature(page)).toHaveCount(0);

  // A new tab: right away on the page the visitor left.
  await addLink('_blank');
  const popup = page.waitForEvent('popup');
  await page.locator('#e2e-link').dispatchEvent('click');
  await (await popup).close();
  await expect(creature(page)).toHaveCount(1);
});

test('a signed-in player finds the Test hand creature, then another: recorded on the account', async ({ page, compact }) => {
  await setBeta(page, true);
  await login(page, 'alice', LOAD_PAGE);
  await skipWithoutFixtures(page);
  const id = await page.goto('/pages/decks?lang=fr').then(() => createServerDeck(page, `E2E creatures ${Date.now()}`));

  // Not there before the tab opens.
  await page.goto(`/pages/deck?id=${id}`);
  await expect(page.locator('app-deck-page')).toBeVisible();
  await expect(creature(page)).toHaveCount(0);
  if (compact) await page.getByRole('navigation', { name: 'Consultation du deck' }).getByRole('link', { name: 'Main' }).click();
  else await page.getByRole('tab', { name: 'Main de départ' }).click();
  await expect(creature(page)).toHaveCount(1);
  const fromTestHand = await clickCreature(page);
  expect(fromTestHand.found).toContain('e2e-test-hand');

  await page.goto(LOAD_PAGE);
  const fromNews = await clickCreature(page);
  expect(fromNews.found).toEqual(expect.arrayContaining(['e2e-load', 'e2e-test-hand']));
  const total = await page.evaluate(() => (window as unknown as { acHiddenCreatures: Config }).acHiddenCreatures.all.length);
  // « Trouvé : … ! 2/4 · Code » the first time, « …, déjà trouvé (2/4) · Code » on a later run (alice keeps her finds).
  await expect(page.locator('.ac-toast__message')).toHaveText(new RegExp(`${fromNews.found!.length}/${total}\\)? · Code : E2E-CODE$`));
});
