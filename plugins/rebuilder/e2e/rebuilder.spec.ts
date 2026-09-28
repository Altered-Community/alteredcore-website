import { evidence, expect, login, test, type Page } from '../../../tests/e2e/fixtures';

/**
 * Re:Builder's decks section mounted by the shell on /pages/rebuilder (plugin `rebuilder`): decks
 * list (mine / community), deck page and editor, next to the site's own decks pages and builder,
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

const DECKS = '/pages/rebuilder/decks';
const NEW_DECK = '/pages/rebuilder/decks/new';

test.describe('ReBuilder in the shell · signed in', () => {
  test('creates a deck from the decks list, edits it, finds it in the list and opens its page', async ({ page, compact }, testInfo) => {
    const name = `E2E ${testInfo.project.name} ${Date.now()}`;
    // The browser talks to the site only (relay) for decks, and never sends a bearer token.
    const leaks: string[] = [];
    page.on('request', (req) => {
      if (req.headers()['authorization']) leaks.push(`Authorization on ${req.url()}`);
      if (/\/api\/decks/.test(req.url()) && !req.url().includes('/api/v1/services/decks/')) leaks.push(`direct call ${req.url()}`);
    });
    await login(page, 'alice', `${DECKS}?lang=fr`);
    await expect(page).toHaveURL(/\/pages\/rebuilder\/decks(\?|$)/);
    await expect(page.getByRole('list', { name: 'Mes decks' })).toBeVisible();
    await evidence(page, testInfo, '01-my-decks');

    await page.getByRole('button', { name: FR.newDeck }).first().click();
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/services/decks/api/decks');
    await createDeck(page, name);
    const res = await created;
    expect(res.status()).toBe(201);
    const deck = (await res.json()) as { id: string };
    await expect(page).toHaveURL(new RegExp(`/pages/rebuilder/decks/${deck.id}/edit$`));

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

    // Re:Builder's list shows it (account decks through the relay); its card opens the deck page.
    await page.goto(DECKS);
    const item = page.getByRole('list', { name: 'Mes decks' }).locator('ar-deck-card').filter({ hasText: name });
    await expect(item).toBeVisible();
    await evidence(page, testInfo, '03-listed');
    await item.getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`/pages/rebuilder/decks/${deck.id}$`));
    await expect(page.locator('app-deck-page')).toContainText(name);
    await evidence(page, testInfo, '04-deck-page');

    // Same decks API: the site's own list sees the deck too, and still links to the site's builder.
    await page.goto('/pages/decks');
    const siteItem = page.locator('#my-deck-grid .my-deck-item').filter({ hasText: name });
    await expect(siteItem).toBeVisible();
    await expect(siteItem.locator(`a[href*="/pages/deckbuilder?id=${deck.id}"]`)).toHaveCount(1);
    await page.goto(`/pages/rebuilder?id=${deck.id}`);
    await expect(page).toHaveURL(new RegExp(`/pages/rebuilder/decks/${deck.id}/edit$`));
    expect(leaks).toEqual([]);
  });

  test('lists community decks from the public API, through the relay', async ({ page }, testInfo) => {
    await login(page, 'alice', `${DECKS}?lang=fr`);
    const listed = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/services/decks/api/decks/public' && r.ok());
    await page.getByRole('tab', { name: 'Communauté' }).click();
    const body = (await (await listed).json()) as { member: { legal: boolean }[] };
    await expect(page).toHaveURL(/\/pages\/rebuilder\/decks\?(.*&)?tab=community/);
    // The local stack may have no public deck: the list is there, with the legal ones of the page.
    const list = page.getByRole('list', { name: 'Decks de la communauté' });
    await expect(list).toBeAttached();
    await expect(list.locator('ar-deck-card')).toHaveCount(body.member.filter((d) => d.legal).length);
    await evidence(page, testInfo, '05-community');
  });

  test('follows the site theme live and the site language', async ({ page, compact }, testInfo) => {
    await login(page, 'alice', `${NEW_DECK}?lang=en&theme=light`);
    await createDeck(page, `E2E theme ${testInfo.project.name} ${Date.now()}`, 'en');
    await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/edit$/);
    await expect(page.locator('ar-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'en');
    await evidence(page, testInfo, '06-light-en');

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
    await evidence(page, testInfo, '07-dark-en');

    await page.goto(`${editor}?lang=fr`);
    await expect(page.locator('ar-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'fr');
    await page.goto(`${editor}?theme=light`);
    await expect(root).toHaveAttribute('data-theme', 'light');
  });

  test('has its own menu, next to the site entries', async ({ page, compact }, testInfo) => {
    test.skip(compact, 'the dropdown is checked on the desktop header');
    await login(page, 'alice', `${DECKS}?lang=en`);
    await expect(page.getByRole('list', { name: 'Mes decks' })).toBeVisible();
    const menu = page.locator('header .nav-item.dropdown').filter({ has: page.locator('a.dropdown-toggle', { hasText: 'Re:Builder' }) });
    await expect(menu.locator('a.dropdown-toggle')).toHaveClass(/\bactive\b/);
    await expect(page.locator('header a.nav-link[href$="/pages/decks"]').first()).not.toHaveClass(/\bactive\b/);
    await menu.locator('a.dropdown-toggle').click();
    await expect(menu.locator('a.dropdown-item[href$="/pages/rebuilder/decks"]')).toBeVisible();
    await expect(menu.locator('a.dropdown-item[href$="/pages/rebuilder/decks/new"]')).toBeVisible();
    await evidence(page, testInfo, '08-menu');

    // On the site's own decks page, the Re:Builder entry is not the active one.
    await page.goto('/pages/decks');
    await expect(menu.locator('a.dropdown-toggle')).not.toHaveClass(/\bactive\b/);
  });
});

test.describe('ReBuilder in the shell · guest', () => {
  test('keeps a guest deck in this browser across reloads', async ({ page, compact }) => {
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, 'Deck invité');
    await expect(page).toHaveURL(/\/decks\/guest-[^/]+\/edit$/);
    await addTwoCards(page);
    await expectDeckCount(page, compact, 2);
    await page.waitForTimeout(600); // autosave debounce (400 ms)
    await page.reload();
    await expectDeckCount(page, compact, 2);
    await page.goto(DECKS);
    await expect(page.getByRole('list', { name: 'Mes decks' }).locator('ar-deck-card').filter({ hasText: 'Deck invité' })).toBeVisible();
  });
});
