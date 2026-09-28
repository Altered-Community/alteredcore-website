import { evidence, expect, login, test, type Page } from '../../../tests/e2e/fixtures';

/**
 * The ReBuilder editor mounted by the shell on /pages/deckbuilder (plugin `rebuilder`),
 * against the local stack: Keycloak session of the site, decks API, production cards API.
 * Playwright locators pierce the open shadow root, so the plugin is driven like any page.
 */

/** Main labels in both site languages (the editor follows AlteredCore.lang). */
const LABELS = {
  fr: { newDeck: 'Nouveau deck', deckName: 'Nom du deck', create: 'Créer le deck', search: 'Recherche', viewDeck: 'Voir le deck', cancel: 'Annuler' },
  en: { newDeck: 'New deck', deckName: 'Deck name', create: 'Create deck', search: 'Search', viewDeck: 'View deck', cancel: 'Cancel' },
};
type Lang = keyof typeof LABELS;
const FR = { ...LABELS.fr, deckNav: 'Éditeur de deck' };

/** Opens the new-deck window, picks the first hero, names the deck and creates it. */
async function createDeck(page: Page, name: string, lang: Lang = 'fr'): Promise<void> {
  const l = LABELS[lang];
  const dialog = page.getByRole('dialog', { name: l.newDeck });
  await expect(dialog).toBeVisible();
  await dialog.locator('ar-hero-tile button').first().click();
  await dialog.getByRole('textbox', { name: l.deckName }).fill(name);
  await dialog.getByRole('button', { name: l.create }).click();
  await expect(dialog).toBeHidden();
}

/** « Recherche / Voir le deck » switch (desktop) or bottom navigation (mobile), in `lang`. */
async function expectEditorLabels(page: Page, compact: boolean, lang: Lang): Promise<void> {
  const l = LABELS[lang];
  if (compact) await expect(page.getByRole('navigation', { name: FR.deckNav }).getByRole('link', { name: l.search })).toBeVisible();
  else await expect(page.locator('ar-segmented').getByText(l.viewDeck, { exact: true })).toBeVisible();
}

/** Adds one copy of the first two cards of the search results; returns their names. */
async function addTwoCards(page: Page): Promise<string[]> {
  const names: string[] = [];
  for (const i of [0, 1]) {
    const tile = page.locator('ar-card-tile').nth(i);
    await expect(tile).toBeVisible();
    names.push((await tile.getAttribute('aria-label')) ?? '');
    await tile.getByRole('button', { name: /^Ajouter .* au deck$/ }).click();
    await expect(tile.getByRole('group', { name: /Exemplaires de/ })).toContainText('1');
  }
  return names;
}

async function expectDeckCount(page: Page, compact: boolean, count: number): Promise<void> {
  if (compact) {
    await expect(page.getByRole('navigation', { name: FR.deckNav }).getByRole('link', { name: /Deck/ })).toContainText(String(count));
  } else {
    await expect(page.locator('app-deck-panel ar-deck-summary')).toContainText(String(count));
  }
}

test.describe('ReBuilder in the shell · signed in', () => {
  test('creates a deck on the account, adds cards, saves, and finds it again after a reload', async ({ page, compact }, testInfo) => {
    const name = `E2E ${testInfo.project.name} ${Date.now()}`;
    // The browser talks to the site only (relay) for decks, and never sends a bearer token.
    const leaks: string[] = [];
    page.on('request', (req) => {
      if (req.headers()['authorization']) leaks.push(`Authorization on ${req.url()}`);
      if (/\/api\/decks/.test(req.url()) && !req.url().includes('/api/v1/services/decks/')) leaks.push(`direct call ${req.url()}`);
    });
    await login(page, 'alice', '/pages/deckbuilder?lang=fr');
    await expect(page).toHaveURL(/\/pages\/deckbuilder\/decks\/new$/);
    await expect(page.getByRole('dialog', { name: FR.newDeck })).toBeVisible();
    await expect(page.locator('ar-hero-tile').first()).toBeVisible();
    await evidence(page, testInfo, '01-new-deck');

    const created = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/services/decks/api/decks');
    await createDeck(page, name);
    const res = await created;
    expect(res.status()).toBe(201);
    const deck = (await res.json()) as { id: string };
    await expect(page).toHaveURL(new RegExp(`/pages/deckbuilder/decks/${deck.id}/edit$`));

    const saved = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/api/decks/${deck.id}`) && r.ok());
    const cards = await addTwoCards(page);
    await expectDeckCount(page, compact, 2);
    await saved;
    await evidence(page, testInfo, '02-cards-added');

    // Reload: the deck comes back from the decks API (not from the browser).
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/decks/${deck.id}/edit$`));
    await expectDeckCount(page, compact, 2);
    if (!compact) {
      await expect(page.locator('ar-editable-title input')).toHaveValue(name);
      for (const card of cards) await expect(page.locator('app-deck-panel')).toContainText(card.replace(/ ×.*$/, ''));
    }
    await evidence(page, testInfo, '03-after-reload');

    // The site's own pages see the same deck; their « Edit » link leads back to this editor.
    await page.goto('/pages/decks');
    const item = page.locator('#my-deck-grid .my-deck-item').filter({ hasText: name });
    await expect(item).toBeVisible();
    const edit = item.locator(`a[href*="/pages/deckbuilder?id=${deck.id}"]`);
    await expect(edit).toHaveCount(1);
    await page.goto(`/pages/deckbuilder?id=${deck.id}`);
    await expect(page).toHaveURL(new RegExp(`/pages/deckbuilder/decks/${deck.id}/edit$`));
    await expectDeckCount(page, compact, 2);
    expect(leaks).toEqual([]);
  });

  test('follows the site theme live and the site language', async ({ page, compact }, testInfo) => {
    await login(page, 'alice', '/pages/deckbuilder?lang=en&theme=light');
    await createDeck(page, `E2E theme ${testInfo.project.name} ${Date.now()}`, 'en');
    await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/edit$/);
    await expect(page.locator('ar-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'en');
    await evidence(page, testInfo, '04-light-en');

    const root = page.locator('.ar-embed');
    await expect(root).toHaveAttribute('data-theme', 'light');
    const lightBg = await root.evaluate((el) => getComputedStyle(el).backgroundColor);
    const editor = new URL(page.url()).pathname;
    // Live switch from the site header when it is shown (desktop), else the site's ?theme= switch.
    const toggle = page.locator('#header-theme-toggle');
    if (await toggle.isVisible()) await toggle.click();
    else await page.goto(`${editor}?theme=dark`);
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => root.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(lightBg);
    await expect(page.locator('ar-card-tile').first()).toBeVisible();
    await evidence(page, testInfo, '05-dark-en');

    await page.goto(`${editor}?lang=fr`);
    await expect(page.locator('ar-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'fr');
    await evidence(page, testInfo, '06-dark-fr');
    await page.goto(`${editor}?theme=light`);
    await expect(root).toHaveAttribute('data-theme', 'light');
    await evidence(page, testInfo, '07-light-fr');
  });

  test('highlights its menu entry in the site navigation', async ({ page }, testInfo) => {
    await login(page, 'alice', '/pages/deckbuilder?lang=en');
    await createDeck(page, `E2E menu ${testInfo.project.name} ${Date.now()}`, 'en');
    await expect(page.locator('ar-card-tile').first()).toBeVisible();
    const link = page.locator('header a[href$="/pages/deckbuilder"]').first();
    await expect(link).toHaveClass(/\bactive\b/);
    await expect(page.locator('header a[href$="/pages/decks"]').first()).not.toHaveClass(/\bactive\b/);
    await evidence(page, testInfo, '08-menu-active');
  });
});

test.describe('ReBuilder in the shell · guest', () => {
  test('keeps a guest deck in this browser across reloads', async ({ page, compact }) => {
    await page.goto('/pages/deckbuilder?lang=fr');
    await createDeck(page, 'Deck invité');
    await expect(page).toHaveURL(/\/decks\/guest-[^/]+\/edit$/);
    await addTwoCards(page);
    await expectDeckCount(page, compact, 2);
    await page.waitForTimeout(600); // autosave debounce (400 ms)
    await page.reload();
    await expectDeckCount(page, compact, 2);
  });
});
