import { deflateRawSync } from 'node:zlib';
import { evidence, expect, login, test, type Page } from '../../../tests/e2e/fixtures';

/**
 * Re:Builder's decks section mounted by the shell on /pages/rebuilder (plugin `rebuilder`): decks
 * list (mine / community), deck page and editor, next to the site's own decks pages and builder,
 * against the local stack: Keycloak session of the site, decks API, production cards API.
 * Playwright locators pierce the open shadow root, so the plugin is driven like any page.
 */

/** Labels in both site languages (the interface follows AlteredCore.lang). */
const LABELS = {
  fr: {
    newDeck: 'Nouveau deck', deckName: 'Nom du deck', create: 'Créer le deck', search: 'Recherche', viewDeck: 'Voir le deck', cancel: 'Annuler',
    deckNav: 'Éditeur de deck', myDecks: 'Mes decks', community: 'Communauté', communityDecks: 'Decks de la communauté',
    sortBy: 'Trier par', guest: 'Mode invité', rarity: 'Rareté', advanced: 'Recherche avancée', clearAll: 'Tout effacer',
  },
  en: {
    newDeck: 'New deck', deckName: 'Deck name', create: 'Create deck', search: 'Search', viewDeck: 'View deck', cancel: 'Cancel',
    deckNav: 'Deck editor', myDecks: 'My decks', community: 'Community', communityDecks: 'Community decks',
    sortBy: 'Sort by', guest: 'Guest mode', rarity: 'Rarity', advanced: 'Advanced search', clearAll: 'Clear all',
  },
};
type Lang = keyof typeof LABELS;
const FR = LABELS.fr;

/** Opens the new-deck window, picks the first hero, names the deck and creates it. */
async function createDeck(page: Page, name: string, lang: Lang = 'fr'): Promise<void> {
  const l = LABELS[lang];
  const dialog = page.getByRole('dialog', { name: l.newDeck });
  await expect(dialog).toBeVisible();
  await dialog.locator('ac-hero-tile button').first().click();
  await dialog.getByRole('textbox', { name: l.deckName }).fill(name);
  await dialog.getByRole('button', { name: l.create }).click();
  await expect(dialog).toBeHidden();
}

/** « Recherche / Voir le deck » switch (desktop) or bottom navigation (mobile), in `lang`. */
async function expectEditorLabels(page: Page, compact: boolean, lang: Lang): Promise<void> {
  const l = LABELS[lang];
  if (compact) await expect(page.getByRole('navigation', { name: l.deckNav }).getByRole('link', { name: l.search })).toBeVisible();
  else await expect(page.locator('ac-segmented').getByText(l.viewDeck, { exact: true })).toBeVisible();
}

/** Adds one copy of the first two cards of the search results; returns their names. */
async function addTwoCards(page: Page): Promise<string[]> {
  const names: string[] = [];
  for (const i of [0, 1]) {
    const tile = page.locator('ac-card-tile').nth(i);
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
    await expect(page.locator('app-deck-panel ac-deck-summary')).toContainText(String(count));
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
      await expect(page.locator('ac-editable-title input')).toHaveValue(name);
      for (const card of cards) await expect(page.locator('app-deck-panel')).toContainText(card.replace(/ ×.*$/, ''));
    }

    // Re:Builder's list shows it (account decks through the relay); its card opens the deck page.
    await page.goto(DECKS);
    const item = page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: name });
    await expect(item).toBeVisible();
    await evidence(page, testInfo, '03-listed');
    await item.getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`/pages/rebuilder/decks/${deck.id}$`));
    await expect(page.locator('app-deck-page')).toContainText(name);
    await evidence(page, testInfo, '04-deck-page');
    // Alice's own deck: she can edit it.
    const deckPage = page.locator('app-deck-page');
    await expect(deckPage.getByRole('button', { name: 'Modifier le deck' })).toBeVisible();

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
    // The list goes through the relay. The app may cancel a request and send a new one (query
    // change), so its response body is not read here: the expected page is fetched separately.
    const listed = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/services/decks/api/decks/public' && r.ok());
    await page.getByRole('tab', { name: 'Communauté' }).click();
    await listed;
    await expect(page).toHaveURL(/\/pages\/rebuilder\/decks\?(.*&)?tab=community/);
    // The stack seeds public decks (docker/stack/seed-decks.php); the list shows the legal ones of page 1.
    const res = await page.request.get('/api/v1/services/decks/api/decks/public', {
      params: { page: 1, itemsPerPage: 24, 'order[updatedAt]': 'desc' },
      headers: { Accept: 'application/json' },
    });
    expect(res.status()).toBe(200);
    const legal = ((await res.json()) as { member: { legal: boolean }[] }).member.filter((d) => d.legal).length;
    expect(legal).toBeGreaterThan(0);
    const list = page.getByRole('list', { name: 'Decks de la communauté' });
    await expect(list.locator('ac-deck-card')).toHaveCount(legal);
    await evidence(page, testInfo, '05-community');

    // Someone else's deck (seeded as bob): no « Modifier » nor « Supprimer », « Dupliquer » stays.
    await list.locator('ac-deck-card').first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/pages\/rebuilder\/decks\/[0-9a-f-]{36}$/);
    const deckPage = page.locator('app-deck-page');
    await expect(deckPage.locator('ac-card-art').first()).toBeVisible();
    await expect(deckPage.getByRole('button', { name: /Plus d’actions|Dupliquer/ }).first()).toBeVisible();
    await expect(deckPage.getByRole('button', { name: 'Modifier le deck' })).toHaveCount(0);
    await expect(deckPage.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
    await evidence(page, testInfo, '05b-community-deck');
  });

  test('follows the site theme live and the site language', async ({ page, compact }, testInfo) => {
    await login(page, 'alice', `${NEW_DECK}?lang=en&theme=light`);
    await createDeck(page, `E2E theme ${testInfo.project.name} ${Date.now()}`, 'en');
    await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/edit$/);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'en');
    await evidence(page, testInfo, '06-light-en');

    const root = page.locator('.ac-plugin-root');
    await expect(root).toHaveAttribute('data-theme', 'light');
    const lightBg = await root.evaluate((el) => getComputedStyle(el).backgroundColor);
    const editor = new URL(page.url()).pathname;
    // Live switch from the site header when it is shown (desktop), else the site's ?theme= switch.
    const toggle = page.locator('#header-theme-toggle');
    if (await toggle.isVisible()) await toggle.click();
    else await page.goto(`${editor}?theme=dark`);
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => root.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(lightBg);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    await evidence(page, testInfo, '07-dark-en');

    await page.goto(`${editor}?lang=fr`);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'fr');
    await page.goto(`${editor}?theme=light`);
    await expect(root).toHaveAttribute('data-theme', 'light');
  });

  test('has a beta entry in the site\'s Decks menu', async ({ page, compact }, testInfo) => {
    test.skip(compact, 'the menu is checked on the desktop header');
    await login(page, 'alice', `${DECKS}?lang=en`);
    await expect(page.getByRole('list', { name: LABELS.en.myDecks })).toBeVisible();
    // One entry, on the decks list (a new deck is created from the list), inside the Decks menu.
    const decksMenu = page.locator('header li.dropdown').filter({ has: page.locator('a.nav-link-split-main[href$="/pages/decks"]') });
    const entry = decksMenu.locator('a.dropdown-item[href$="/pages/rebuilder/decks"]');
    await expect(entry).toHaveCount(1);
    await expect(entry).toContainText('Re:Builder (beta)');
    await expect(page.locator('header a[href*="/pages/rebuilder/"]')).toHaveCount(1);
    await expect(entry).toHaveClass(/\bactive\b/);
    // The Decks menu is the current section; its « Decks » item (the site's list) is not current.
    await expect(decksMenu).toHaveClass(/\bactive\b/);
    await expect(decksMenu.locator('a.dropdown-item[href$="/pages/decks"]')).not.toHaveClass(/\bactive\b/);
    await decksMenu.locator('.nav-link-split-caret').click();
    await expect(entry).toBeVisible();
    await evidence(page, testInfo, '08-menu');
    await page.keyboard.press('Escape');

    // Still current in the editor, after a client navigation and after a reload.
    await page.getByRole('button', { name: LABELS.en.newDeck }).first().click();
    await createDeck(page, `E2E menu ${testInfo.project.name} ${Date.now()}`, 'en');
    await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/edit$/);
    await expect(entry).toHaveClass(/\bactive\b/);
    await page.reload();
    await expect(entry).toHaveClass(/\bactive\b/);

    // On the site's own decks page, the site's item is current, not Re:Builder's.
    await page.goto('/pages/decks');
    await expect(entry).not.toHaveClass(/\bactive\b/);
    await expect(decksMenu.locator('a.dropdown-item[href$="/pages/decks"]')).toHaveClass(/\bactive\b/);
  });
});

test.describe('ReBuilder in the shell · languages', () => {
  // Decks list, community tab, editor search and deck summary, in each site language; the switch
  // goes through the site's ?lang= (a change reloads the page, translations load before the app).
  for (const lang of ['en', 'fr'] as const) {
    test(`shows its interface in the site language (${lang})`, async ({ page, compact }, testInfo) => {
      const l = LABELS[lang];
      const other = LABELS[lang === 'en' ? 'fr' : 'en'];
      await page.goto(`${DECKS}?lang=${lang}`);
      await expect(page.locator('.ac-plugin-root')).toBeVisible();
      // A guest without decks: the list is empty (hidden on mobile), the guest notice is shown.
      await expect(page.getByRole('list', { name: l.myDecks })).toBeAttached();
      await expect(page.getByText(l.guest)).toBeVisible();
      if (!compact) await expect(page.getByText(l.sortBy, { exact: true })).toBeVisible();
      await expect(page.getByText(other.guest)).toHaveCount(0);

      await page.getByRole('tab', { name: l.community }).click();
      await expect(page.getByRole('list', { name: l.communityDecks }).locator('ac-deck-card').first()).toBeVisible();
      await evidence(page, testInfo, `09-community-${lang}`);

      await page.goto(NEW_DECK);
      await createDeck(page, `E2E ${lang} ${testInfo.project.name} ${Date.now()}`, lang);
      await expect(page.locator('ac-card-tile').first()).toBeVisible();
      await expectEditorLabels(page, compact, lang);
      if (!compact) {
        await expect(page.getByText(l.rarity, { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: l.advanced })).toBeVisible();
        await expect(page.getByRole('button', { name: l.clearAll })).toBeVisible();
      }
      await expect(page.getByText(other.advanced)).toHaveCount(0);
      await evidence(page, testInfo, `10-editor-${lang}`);
    });
  }
});

test.describe('ReBuilder in the shell · Uniques search', () => {
  test('ORs the values of a criterion and ANDs the effects, on the Uniques search API', async ({ page, compact }, testInfo) => {
    test.skip(compact, 'the effect filter is checked on the desktop panel');
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, `E2E uniques ${Date.now()}`);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    const searches: URL[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/v2/cards')) searches.push(new URL(r.url()));
    });
    await page.getByRole('tab', { name: 'Uniques' }).click();
    await expect(page.locator('ac-unique-card').first()).toBeVisible();

    /** Picks `text` (exact) in the criterion `index` of the open effect window. */
    const pick = async (index: number, text: string) => {
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('combobox').nth(index).click();
      await page.locator('.cdk-overlay-container .panel input').fill(text);
      await page.getByRole('option', { name: text, exact: true }).click();
      await expect(dialog.locator('ac-combobox').nth(index).locator('.picked').filter({ hasText: text })).toBeVisible();
    };
    const editEffect = async (open: () => Promise<void>, picks: [number, string][]) => {
      await open();
      for (const [i, text] of picks) await pick(i, text);
      await page.getByRole('dialog').getByRole('button', { name: 'Appliquer' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    };
    const addEffect = () => page.getByRole('button', { name: 'Ajouter un effet' }).click();

    await editEffect(addEffect, [[0, 'Joué depuis la Main'], [1, 'Sans condition'], [2, 'Piochez une carte.']]);
    await editEffect(addEffect, [[2, 'Piochez une carte.']]);
    await editEffect(() => page.locator('ac-effect-summary').first().getByRole('button').first().click(), [[0, 'Joué de partout']]);

    // One request: both triggers OR-ed in the first effect, the two effects AND-ed, and the second
    // (« Piochez », which covers the first) on two abilities, so one drawing ability does not answer both.
    await expect.poll(() => searches.at(-1)?.searchParams.get('effect[0][t]')).toBe('22,24');
    const last = searches.at(-1)!;
    expect(last.searchParams.get('effect[0][c]')).toBe('191');
    expect(last.searchParams.get('effect[1][o]')).toBe(last.searchParams.get('effect[0][o]'));
    expect(last.searchParams.get('effect[1][matchCount]')).toBe('2');
    expect(last.searchParams.get('effectMode')).toBe('and');
    const total = async (url: URL) => ((await (await page.request.get(url.toString())).json()) as { iter: { total: number } }).iter.total;
    const both = await total(last);
    const handOnly = new URL(last);
    handOnly.searchParams.set('effect[0][t]', '22');
    const sameAbility = new URL(last);
    sameAbility.searchParams.delete('effect[1][matchCount]');
    expect(both).toBeGreaterThan(await total(handOnly));
    expect(both).toBeLessThan(await total(sameAbility));
    // The count shown is the API's for that request.
    await expect(page.locator('.results .total, .results').getByText(new RegExp(`^${both.toLocaleString('fr-FR').replace(/\s/g, '\\s')} cartes?$`))).toBeVisible();
    await evidence(page, testInfo, '11-uniques-effects');
  });
});

test.describe('ReBuilder in the shell · Starter Deck Contest', () => {
  test('lists the contest winners, then every entry, with the site filters', async ({ page }, testInfo) => {
    await page.goto(`${DECKS}?tab=contest&lang=fr`);
    const list = page.getByRole('list', { name: 'Decks du concours deck de démarrage' });
    await expect(list.locator('ac-deck-card')).toHaveCount(27);
    await expect(list.locator('ac-deck-card').first()).toContainText('Gagnant');
    await evidence(page, testInfo, '12-contest');
    await page.getByText('Toutes les decklists', { exact: true }).click();
    await expect(list.locator('ac-deck-card')).toHaveCount(186);
    await page.getByRole('textbox', { name: 'Rechercher un deck' }).first().fill('Akesha');
    await expect(list.locator('ac-deck-card').first()).toContainText('Akesha');
    await expect(list.locator('ac-deck-card').filter({ hasNotText: 'Akesha' })).toHaveCount(0);
    // A contest deck is a public deck of the decks API, opened like any other.
    await expect(list.locator('ac-deck-card').first().getByRole('link').first()).toHaveAttribute('href', /\/decks\/[0-9a-f-]{36}$/);
  });
});

/** A ZIP with the given entries, deflated: an altered.gg personal-data export in miniature. */
function zipOf(entries: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const nameBuf = Buffer.from(name);
    const raw = Buffer.from(text);
    const data = deflateRawSync(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

test.describe('ReBuilder in the shell · altered.gg export', () => {
  test('imports the decks of the export into the account, and skips them the second time', async ({ page, compact }, testInfo) => {
    const name = `Equinox ${testInfo.project.name} ${Date.now()}`;
    const rows = ['ALT_CORE_B_AX_04_C', 'ALT_CORE_B_AX_05_C', 'ALT_CORE_B_AX_06_C'].map((ref) => `d1;${name};standard;ALT_CORE_B_AX_01_C;x;${ref};C;3`);
    const zip = zipOf({ 'export/profile.json': '{}', 'export/decks.csv': `﻿id;name;format;hero;card;reference;rarity;quantity\n${rows.join('\n')}\n` });
    await login(page, 'alice', `${DECKS}?lang=fr`);
    for (const expected of ['1 deck importé', 'Aucun deck importé, 1 déjà existant']) {
      await page.getByRole('button', { name: compact ? 'Importer un deck' : 'Importer', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Importer des decks' });
      await dialog.getByText('Export altered.gg', { exact: true }).click();
      await dialog.locator('input[type=file]').setInputFiles({ name: 'altered-export.zip', mimeType: 'application/zip', buffer: zip });
      await dialog.getByRole('button', { name: 'Importer', exact: true }).click();
      await expect(dialog.getByText(expected, { exact: true })).toBeVisible({ timeout: 30_000 });
      await dialog.getByRole('button', { name: 'Terminer' }).click();
    }
    // One deck in the account, with the hero and the 9 cards of the export.
    const deck = page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: name });
    await expect(deck).toHaveCount(1);
    await expect(deck).toContainText('9 cartes');
    await expect(deck).toContainText('Sierra & Oddball');
    await evidence(page, testInfo, '13-equinox-import');
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
    await expect(page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: 'Deck invité' })).toBeVisible();
  });
});
