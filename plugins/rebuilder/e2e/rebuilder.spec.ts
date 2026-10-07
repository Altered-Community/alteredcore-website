import { deflateRawSync } from 'node:zlib';
import { evidence, expect, login, setBeta, test, type Page } from '../../../tests/e2e/fixtures';

/**
 * Re:Builder's decks section (plugin `rebuilder`): with « Beta Deckbuilder » on (cookie ac_beta), the shell serves it
 * on the site's decks pages, at their URLs (/pages/decks, /pages/deck?id=…, /pages/deckbuilder?id=…): decks list
 * (mine / community), deck page and editor, against the local stack: Keycloak session of the site, decks API,
 * production cards API. Playwright locators pierce the open shadow root, so the plugin is driven like any page.
 */

/** Labels in both site languages (the interface follows AlteredCore.lang). */
const LABELS = {
  fr: {
    newDeck: 'Nouveau deck', deckName: 'Nom du deck', create: 'Créer le deck', search: 'Recherche', viewDeck: 'Aperçu', cancel: 'Annuler',
    deckNav: 'Éditeur de deck', decksNav: 'Decks', myDecks: 'Mes decks', community: 'Communauté', communityDecks: 'Decks de la communauté',
    sortBy: 'Trier par', guest: 'Mode invité', rarity: 'Rareté', advanced: 'Recherche avancée', clearAll: 'Tout effacer',
  },
  en: {
    newDeck: 'New deck', deckName: 'Deck name', create: 'Create deck', search: 'Search', viewDeck: 'Preview', cancel: 'Cancel',
    deckNav: 'Deck editor', decksNav: 'Decks', myDecks: 'My decks', community: 'Community', communityDecks: 'Community decks',
    sortBy: 'Sort by', guest: 'Guest mode', rarity: 'Rarity', advanced: 'Advanced search', clearAll: 'Clear all',
  },
};
type Lang = keyof typeof LABELS;
const FR = LABELS.fr;
/** The deck page's « Modifier » (deck bar, from 768 px) or « Modifier le deck » (app bar, phones). */
const EDIT_DECK = /^Modifier( le deck)?$/;

/** Opens the new-deck window, picks the first hero, names the deck and creates it. */
async function createDeck(page: Page, name: string, lang: Lang = 'fr'): Promise<void> {
  const l = LABELS[lang];
  const dialog = page.getByRole('dialog', { name: l.newDeck });
  await expect(dialog).toBeVisible();
  await dialog.locator('ac-hero-tile button').first().click();
  // The hero pre-fills the name (« Deck <hero> »): wait for it, or it lands after the typed name.
  const field = dialog.getByRole('textbox', { name: l.deckName });
  await expect(field).not.toHaveValue('');
  await field.fill(name);
  await dialog.getByRole('button', { name: l.create }).click();
  await expect(dialog).toBeHidden();
}

/** « Recherche / Aperçu » switch (desktop) or bottom navigation (mobile), in `lang`. */
async function expectEditorLabels(page: Page, compact: boolean, lang: Lang): Promise<void> {
  const l = LABELS[lang];
  if (compact) await expect(page.getByRole('navigation', { name: l.deckNav }).getByRole('link', { name: l.search })).toBeVisible();
  else await expect(page.locator('ac-segmented').getByText(l.viewDeck, { exact: true })).toBeVisible();
}

/** Decks list tab: tabs on desktop, bottom navigation on mobile. */
function decksTab(page: Page, compact: boolean, name: string, lang: Lang = 'fr') {
  return compact
    ? page.getByRole('navigation', { name: LABELS[lang].decksNav }).getByRole('link', { name })
    : page.getByRole('tab', { name });
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
    await expect(page.locator('app-deck-bar .meta strong')).toHaveText(new RegExp(`^${count} cartes?$`));
  }
}

const DECKS = '/pages/decks';
const NEW_DECK = '/pages/deckbuilder';
const DECK = (id: string) => `/pages/deck?id=${id}`;
const EDITOR = (id: string) => `/pages/deckbuilder?id=${id}`;
/** The page URL is `path`, optionally followed by more query parameters (`&lang=…`) when `more`. */
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const at = (path: string, more = false) => new RegExp(`${escape(path)}${more ? '(&|$)' : '$'}`);

test.beforeEach(async ({ page }) => setBeta(page, true));

test.describe('ReBuilder in the shell · signed in', () => {
  test('creates a deck from the decks list, edits it, finds it in the list and opens its page', { tag: '@mobile' }, async ({ page, compact }, testInfo) => {
    const name = `E2E ${testInfo.project.name} ${Date.now()}`;
    // The browser talks to the site only (relay) for decks, and never sends a bearer token.
    const leaks: string[] = [];
    page.on('request', (req) => {
      if (req.headers()['authorization']) leaks.push(`Authorization on ${req.url()}`);
      if (/\/api\/decks/.test(req.url()) && !req.url().includes('/api/v1/services/decks/')) leaks.push(`direct call ${req.url()}`);
    });
    await login(page, 'alice', `${DECKS}?lang=fr`);
    await expect(page).toHaveURL(/\/pages\/decks(\?|$)/);
    await expect(page.getByRole('list', { name: 'Mes decks' })).toBeVisible();
    await evidence(page, testInfo, '01-my-decks');

    await page.getByRole('button', { name: FR.newDeck }).first().click();
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/services/decks/api/decks');
    await createDeck(page, name);
    const res = await created;
    expect(res.status()).toBe(201);
    const deck = (await res.json()) as { id: string };
    await expect(page).toHaveURL(at(EDITOR(deck.id)));

    // The save of the final state (hero + 2 cards): with the 400 ms autosave delay, a slow runner may save each card apart.
    const saved = page.waitForResponse((r) => {
      if (r.request().method() !== 'PATCH' || !r.url().includes(`/api/decks/${deck.id}`) || !r.ok()) return false;
      const lines = ((r.request().postDataJSON() as { deckCards?: { quantity: number }[] } | null)?.deckCards ?? []);
      return lines.reduce((n, l) => n + l.quantity, 0) === 3;
    });
    const cards = await addTwoCards(page);
    await expectDeckCount(page, compact, 2);
    await saved;
    await evidence(page, testInfo, '02-cards-added');

    // Reload: the deck comes back from the decks API (not from the browser).
    await page.reload();
    await expect(page).toHaveURL(at(EDITOR(deck.id)));
    await expectDeckCount(page, compact, 2);
    if (!compact) {
      await expect(page.locator('app-deck-bar h1')).toHaveText(name);
      for (const card of cards) await expect(page.locator('app-deck-panel')).toContainText(card.replace(/ ×.*$/, ''));
    }

    // Re:Builder's list shows it (account decks through the relay); its card opens the editor on « Aperçu »: the deck
    // board from 768 px, the deck preview on phones.
    await page.goto(DECKS);
    const item = page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: name });
    await expect(item).toBeVisible();
    await evidence(page, testInfo, '03-listed');
    await item.getByRole('link').first().click();
    await expect(page).toHaveURL(at(`${EDITOR(deck.id)}&view=apercu`));
    // Phones: the deck page's actions (image, copy, duplicate, delete) are in the app bar's « ⋯ ».
    if (compact) {
      await expect(page.locator('app-deck-preview')).toBeVisible();
      await page.getByRole('button', { name: 'Plus d’actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Supprimer' })).toBeVisible();
      await page.keyboard.press('Escape');
    }
    else await expect(page.locator('app-deck-board ac-card-pile')).toHaveCount(2);
    await evidence(page, testInfo, '04-editor-board');
    await page.goto(DECK(deck.id));
    await expect(page).toHaveURL(at(DECK(deck.id)));
    await expect(page.locator('app-deck-page')).toContainText(name);
    await evidence(page, testInfo, '04-deck-page');
    // Alice's own deck: she can edit it.
    const deckPage = page.locator('app-deck-page');
    await expect(deckPage.getByRole('button', { name: EDIT_DECK })).toBeVisible();

    // Same decks API: with the beta off, the site's own list sees the deck too, and links to the same editor URL.
    await setBeta(page, false);
    await page.goto('/pages/decks');
    const siteItem = page.locator('#my-deck-grid .my-deck-item').filter({ hasText: name });
    await expect(siteItem).toBeVisible();
    await expect(siteItem.locator(`a[href*="${EDITOR(deck.id)}"]`)).toHaveCount(1);
    // A former link of the plugin's own page lands on the site's URL.
    await setBeta(page, true);
    await page.goto(`/pages/rebuilder?id=${deck.id}`);
    await expect(page).toHaveURL(at(EDITOR(deck.id)));
    expect(leaks).toEqual([]);
  });

  test('shows the page skeleton while the scripts load, then the deck skeleton while the deck loads, never an empty deck', { tag: '@mobile' }, async ({ page }) => {
    await login(page, 'alice', `${NEW_DECK}?lang=fr`);
    await createDeck(page, `E2E skeleton ${Date.now()}`);
    await expect(page).toHaveURL(/[?&]id=/);
    const id = new URL(page.url()).searchParams.get('id')!;

    // The app's scripts and the deck are held: the server's skeleton stands for the page meanwhile.
    let releaseScripts!: () => void;
    const scripts = new Promise<void>((resolve) => (releaseScripts = resolve));
    await page.route(/\/plugins\/rebuilder\/dist\/browser\/main-[^/]+\.js/, async (route) => {
      await scripts;
      await route.continue();
    });
    let releaseDeck!: () => void;
    const deckAnswer = new Promise<void>((resolve) => (releaseDeck = resolve));
    await page.route(new RegExp(`/api/v1/services/decks/api/decks/${id}(\\?|$)`), async (route) => {
      if (route.request().method() === 'GET') await deckAnswer;
      await route.continue();
    });
    await page.goto(`${EDITOR(id)}&view=apercu&lang=fr`, { waitUntil: 'domcontentloaded' });
    const placeholder = page.locator('.ac-spa-placeholder');
    await expect(placeholder.locator('.ac-skeleton').filter({ visible: true }).first()).toBeVisible();
    await expect(placeholder.getByRole('status')).toHaveText('Chargement…');

    // The app draws the editor: the deck skeleton replaces the server's, the store's empty deck never shows.
    releaseScripts();
    await expect(placeholder).toHaveCount(0);
    const deckView = page.locator('app-deck-board, app-deck-preview');
    await expect(deckView.locator('.ac-skeleton').first()).toBeVisible();
    await expect(page.getByText('Deck vide')).toHaveCount(0);
    await expect(page.getByText(/^0 cartes?/)).toHaveCount(0);

    releaseDeck();
    await expect(deckView.locator('.ac-skeleton')).toHaveCount(0);
    await expect(page.getByText('Deck vide')).toBeVisible();
  });

  for (const { tab, short, endpoint, shot } of [
    { tab: 'Collection physique', short: 'Collection', endpoint: 'collection-search', shot: '15-collection-search' },
    { tab: 'Propriété numérique', short: null, endpoint: 'ownership-search', shot: '15-owned-search' },
  ]) {
    test(`lists « ${tab} » with every rarity, type and set of the default filters`, async ({ page, compact }, testInfo) => {
      await login(page, 'alice', `${NEW_DECK}?lang=fr`);
      await createDeck(page, `E2E ${endpoint} ${Date.now()}`);
      const request = page.waitForRequest((r) => r.url().includes(`/papi/core-altered-cards/${endpoint}`));
      if (compact && !short) {
        // Compact screens: the last sources are in the « Plus » menu of the tabs.
        await page.getByRole('tab', { name: 'Plus' }).click();
        await page.getByRole('menuitemradio', { name: tab }).click();
      } else {
        await page.getByRole('tab', { name: compact && short ? short : tab, exact: true }).click();
      }
      // The Axiom cards of the stack's mock (docker/stack/ownership-mock): commons, rares, two sets.
      const tiles = page.locator('app-search-results ac-card-tile');
      await expect(tiles).toHaveCount(4);
      await expect(tiles.and(page.locator('[aria-label*="La Machine dans la Glace"]'))).toHaveCount(1);
      // Lists in their array form: PHP keeps the last value of a repeated `rarity=…`.
      const query = new URL((await request).url()).searchParams;
      expect(query.getAll('rarity[]')).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(query.getAll('cardType[]').length).toBeGreaterThan(1);
      await evidence(page, testInfo, shot);
    });
  }

  test('marks the chosen illustration of each token without a copy number (one copy)', async ({ page, compact }, testInfo) => {
    await login(page, 'alice', `${NEW_DECK}?lang=fr`);
    await createDeck(page, `E2E token arts ${Date.now()}`);
    if (compact) await page.getByRole('navigation', { name: FR.deckNav }).getByRole('link', { name: /Deck/ }).click();
    await page.getByRole('button', { name: compact ? 'Choisir les arts des jetons' : 'Arts des jetons' }).click();
    const dialog = page.getByRole('dialog', { name: 'Illustrations des jetons' });
    const families = dialog.locator('app-alt-art-slots');
    await expect(families.first()).toBeVisible();
    // One marker a token, all of them « Illustration choisie », none numbered.
    await expect(dialog.getByRole('img', { name: 'Illustration choisie' })).toHaveCount(await families.count());
    await expect(dialog.locator('.marker')).toHaveCount(await families.count());
    await expect(dialog.locator('.marker').filter({ hasText: /\d/ })).toHaveCount(0);
    await evidence(page, testInfo, '16-token-arts');
  });

  test('deletes a deck after a confirmation in a design-system dialog, not the browser’s', { tag: '@mobile' }, async ({ page, compact }, testInfo) => {
    const name = `E2E delete ${testInfo.project.name} ${Date.now()}`;
    const browserDialogs: string[] = [];
    page.on('dialog', (d) => {
      browserDialogs.push(d.message());
      void d.dismiss();
    });
    await login(page, 'alice', `${NEW_DECK}?lang=fr`);
    await createDeck(page, name);
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=[0-9a-f-]{36}$/);
    const id = new URL(page.url()).searchParams.get('id')!;
    await page.goto(DECK(id));
    const deckPage = page.locator('app-deck-page');
    await expect(deckPage).toContainText(name);

    // Desktop: « Supprimer » in the deck bar; mobile: in the « Plus d’actions » sheet.
    const askDelete = async () => {
      if (compact) {
        await deckPage.getByRole('button', { name: /^Plus d’actions/ }).click();
        await page.getByRole('menuitem', { name: 'Supprimer' }).click();
      } else {
        await deckPage.getByRole('button', { name: 'Supprimer' }).click();
      }
    };
    const confirm = page.getByRole('dialog', { name: 'Supprimer le deck ?' });

    await askDelete();
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText(`« ${name} » sera supprimé.`);
    await evidence(page, testInfo, '04c-delete-confirm');
    await confirm.getByRole('button', { name: 'Annuler' }).click();
    await expect(confirm).toBeHidden();
    await expect(page).toHaveURL(at(DECK(id)));

    await askDelete();
    const deleted = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes(`/api/decks/${id}`));
    await confirm.getByRole('button', { name: 'Supprimer' }).click();
    expect((await deleted).ok()).toBe(true);
    await expect(page).toHaveURL(/\/pages\/decks(\?|$)/);
    await expect(page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: name })).toHaveCount(0);
    expect(browserDialogs).toEqual([]);
  });

  test('touch: every control of the windows is at least --ac-hit-min (44 px) on each side', { tag: '@mobile' }, async ({ page, compact }, testInfo) => {
    test.skip(!compact, 'touch density: mobile project');
    await login(page, 'alice', `${NEW_DECK}?lang=fr`);
    const name = `E2E touch ${testInfo.project.name} ${Date.now()}`;
    await createDeck(page, name);
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=[0-9a-f-]{36}$/);
    const id = new URL(page.url()).searchParams.get('id')!;
    const hitMin = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ac-hit-min')));
    expect(hitMin).toBe(44);

    /**
     * Visible controls of the open window whose tap area is smaller than hitMin, as « label: width×height ». The
     * tap area is what `elementFromPoint` finds at the edges of a hitMin box centred on the control, so a control
     * drawn smaller with a wider hit area (chips) passes.
     */
    const tooSmall = (dialog: ReturnType<Page['getByRole']>) =>
      dialog.locator('button, a[href], [role="tab"], [role="menuitem"], [role="option"], input:not([type="hidden"]), select').evaluateAll(
        (els, min) =>
          els
            .filter((el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden')
            // Links inside a sentence are exempt (WCAG 2.5.8 « inline »).
            .filter((el) => !(el.tagName === 'A' && getComputedStyle(el).display === 'inline'))
            .filter((el) => {
              el.scrollIntoView({ block: 'center', inline: 'center' });
              const r = el.getBoundingClientRect();
              const root = el.getRootNode() as Document | ShadowRoot;
              const [cx, cy, half] = [r.left + r.width / 2, r.top + r.height / 2, min / 2 - 1];
              const halfX = Math.max(half, r.width / 2 - 1);
              const halfY = Math.max(half, r.height / 2 - 1);
              const points = [[cx - halfX, cy], [cx + halfX, cy], [cx, cy - halfY], [cx, cy + halfY]];
              return points.some(([x, y]) => {
                const hit = root.elementFromPoint(x, y);
                return !hit || (hit !== el && !el.contains(hit));
              });
            })
            .map((el) => {
              const r = el.getBoundingClientRect();
              return `${(el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().slice(0, 40)}: ${Math.round(r.width)}×${Math.round(r.height)}`;
            }),
        hitMin,
      );
    const check = async (name: string, open: () => Promise<void>) => {
      await open();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      expect(await tooSmall(dialog), name).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    };

    await page.goto(DECK(id));
    await expect(page.locator('app-deck-page')).toContainText(name);
    const more = page.locator('app-deck-page').getByRole('button', { name: /^Plus d’actions/ });
    await check('deck actions', () => more.click());
    await check('delete confirmation', async () => {
      await more.click();
      await page.getByRole('menuitem', { name: 'Supprimer' }).click();
      await expect(page.getByRole('dialog', { name: 'Supprimer le deck ?' })).toBeVisible();
    });
    await check('duplicate', async () => {
      await more.click();
      await page.getByRole('menuitem', { name: /Dupliquer/ }).click();
      await expect(page.getByRole('dialog', { name: 'Dupliquer le deck' })).toBeVisible();
    });
    await page.goto(`${DECKS}?lang=fr`);
    await check('deck filters', () => page.getByRole('button', { name: /^Filtres/ }).first().click());
    await check('import', () => page.getByRole('button', { name: 'Importer un deck' }).click());
  });

  test('lists community decks from the public API, through the relay', async ({ page, compact }, testInfo) => {
    await login(page, 'alice', `${DECKS}?lang=fr`);
    // The list goes through the relay. The app may cancel a request and send a new one (query
    // change), so its response body is not read here: the expected page is fetched separately.
    const listed = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/services/decks/api/decks/public' && r.ok());
    await decksTab(page, compact, 'Communauté').click();
    await listed;
    await expect(page).toHaveURL(/\/pages\/decks\?(.*&)?tab=community/);
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
    await expect(page).toHaveURL(/\/pages\/deck\?id=[0-9a-f-]{36}$/);
    const deckPage = page.locator('app-deck-page');
    await expect(deckPage.locator('ac-card-art').first()).toBeVisible();
    await expect(deckPage.getByRole('button', { name: /Plus d’actions|Dupliquer/ }).first()).toBeVisible();
    await expect(deckPage.getByRole('button', { name: EDIT_DECK })).toHaveCount(0);
    await expect(deckPage.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
    await evidence(page, testInfo, '05b-community-deck');
  });

  test('hides illegal community decks by default, and shows them with « Non légal » once « Légaux uniquement » is off', async ({ page, compact }, testInfo) => {
    // The seeded decks are legal: the first deck of each page comes back illegal (Frontier Uniques of an old pool).
    let illegalName = '';
    await page.route(/\/api\/v1\/services\/decks\/api\/decks\/public(\?|$)/, async (route) => {
      const res = await route.fetch();
      const body = (await res.json()) as { member: { name: string; legal: boolean; legalityDetail?: Record<string, boolean> }[] };
      const first = body.member[0];
      if (first) {
        illegalName = first.name;
        first.legal = false;
        first.legalityDetail = { ...first.legalityDetail, global: false, frontierUniques: false };
      }
      await route.fulfill({ response: res, json: body });
    });
    await login(page, 'alice', `${DECKS}?lang=fr&tab=community`);
    const list = page.getByRole('list', { name: 'Decks de la communauté' });
    await expect(list.locator('ac-deck-card').first()).toBeVisible();
    expect(illegalName).not.toBe('');
    await expect(list.locator('ac-deck-card', { hasText: illegalName })).toHaveCount(0);
    await expect(list.getByText('Non légal')).toHaveCount(0);

    if (compact) {
      await page.getByRole('button', { name: /^Filtres/ }).first().click();
      const sheet = page.getByRole('dialog', { name: 'Filtres' });
      await evidence(page, testInfo, '05c-community-legal-only');
      await sheet.getByRole('checkbox', { name: 'Légaux uniquement' }).click();
      await sheet.getByRole('button', { name: 'Appliquer' }).click();
      await expect(page.getByRole('button', { name: 'Filtres, 1 actifs' })).toBeVisible();
    } else {
      await evidence(page, testInfo, '05c-community-legal-only');
      await page.getByRole('switch', { name: 'Légaux uniquement' }).click();
    }
    await expect(page).toHaveURL(/[?&]legal=all(&|$)/);
    const illegal = list.locator('ac-deck-card', { hasText: illegalName });
    await expect(illegal).toHaveCount(1);
    await expect(illegal.getByText('Non légal')).toBeVisible();
    await evidence(page, testInfo, '05d-community-with-illegal');
  });

  test('follows the site theme live and the site language', async ({ page, compact }, testInfo) => {
    await login(page, 'alice', `${NEW_DECK}?lang=en&theme=light`);
    await createDeck(page, `E2E theme ${testInfo.project.name} ${Date.now()}`, 'en');
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=[0-9a-f-]{36}$/);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'en');
    await evidence(page, testInfo, '06-light-en');

    const root = page.locator('.ac-plugin-root');
    await expect(root).toHaveAttribute('data-theme', 'light');
    const lightBg = await root.evaluate((el) => getComputedStyle(el).backgroundColor);
    const editor = page.url();
    // Live switch from the site's account menu.
    await page.locator('#azAccountBtn').click();
    await page.locator('#azAccountMenu [data-az-theme="dark"]').click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => root.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(lightBg);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    await evidence(page, testInfo, '07-dark-en');

    await page.goto(`${editor}&lang=fr`);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    await expectEditorLabels(page, compact, 'fr');
    await page.goto(`${editor}&theme=light`);
    await expect(root).toHaveAttribute('data-theme', 'light');
  });

  test('has one Decks entry in the site menu: Re:Builder with the beta on, the site\'s page with it off', async ({ page, compact }, testInfo) => {
    test.skip(compact, 'the menu is checked on the desktop header');
    await login(page, 'alice', `${DECKS}?lang=en`);
    await expect(page.getByRole('list', { name: LABELS.en.myDecks })).toBeVisible();
    const decksMenu = page.locator('header li.nav-item.dropdown').filter({ has: page.locator('a.dropdown-toggle[title="Decks"]') });
    const entry = decksMenu.locator(`a.dropdown-item[href$="${DECKS}"]`);
    // One entry for the decks pages, the site's own URL: no « Re:Builder (beta) » entry anymore.
    await expect(entry).toHaveCount(1);
    await expect(page.locator('header a[href*="/pages/rebuilder"]')).toHaveCount(0);
    await expect(entry).toHaveClass(/\bactive\b/);
    await decksMenu.locator('a.dropdown-toggle').click();
    await expect(entry).toBeVisible();
    await evidence(page, testInfo, '08-menu');
    await entry.click();
    await expect(page.locator('[data-ac-plugin="rebuilder"]')).toBeAttached();

    // Still current in the editor, after a client navigation and after a reload.
    await page.getByRole('button', { name: LABELS.en.newDeck }).first().click();
    await createDeck(page, `E2E menu ${testInfo.project.name} ${Date.now()}`, 'en');
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=[0-9a-f-]{36}$/);
    await expect(entry).toHaveClass(/\bactive\b/);
    await page.reload();
    await expect(entry).toHaveClass(/\bactive\b/);

    // Beta off: the same entry opens the site's own decks page.
    await setBeta(page, false);
    await page.goto(DECKS);
    await decksMenu.locator('a.dropdown-toggle').click();
    await entry.click();
    await expect(page.locator('#my-deck-grid')).toBeAttached();
    await expect(page.locator('[data-ac-plugin="rebuilder"]')).toHaveCount(0);
    await expect(entry).toHaveClass(/\bactive\b/);
  });
});

test.describe('« Beta Deckbuilder » · one link, two deckbuilders', () => {
  test('a deck link opens the site\'s deck page, then Re:Builder once the beta is on in the account menu', async ({ page }, testInfo) => {
    await setBeta(page, false);
    const res = await page.request.get('/api/v1/services/decks/api/decks/public', { params: { itemsPerPage: 1 }, headers: { Accept: 'application/json' } });
    const deck = ((await res.json()) as { member: { id: string; name: string }[] }).member[0];
    const link = `${DECK(deck.id)}&lang=en`;

    await page.goto(link);
    await expect(page.locator('#deck-share-btn')).toBeVisible();
    await expect(page.locator('[data-ac-plugin="rebuilder"]')).toHaveCount(0);
    await evidence(page, testInfo, '30-deck-link-legacy');

    // « Beta Deckbuilder » in the account menu: the page reloads, same URL, now Re:Builder's deck page.
    await page.locator('#azAccountBtn').click();
    const beta = page.getByRole('switch', { name: 'Beta Deckbuilder' });
    await expect(beta).not.toBeChecked();
    await evidence(page, testInfo, '31-account-menu-beta-off');
    await Promise.all([page.waitForEvent('load'), beta.click()]);
    await expect(page).toHaveURL(at(DECK(deck.id), true));
    await expect(page.locator('app-deck-page')).toContainText(deck.name);
    await expect(page.locator('#deck-share-btn')).toHaveCount(0);
    await evidence(page, testInfo, '32-deck-link-beta');
    await page.locator('#azAccountBtn').click();
    await expect(beta).toBeChecked();
    await evidence(page, testInfo, '33-account-menu-beta-on');

    // Off again: the same link is the site's deck page.
    await Promise.all([page.waitForEvent('load'), beta.click()]);
    await page.goto(link);
    await expect(page.locator('#deck-share-btn')).toBeVisible();
  });
});

test.describe('ReBuilder in the shell · languages', () => {
  // Decks list, community tab, editor search and deck summary, in each site language; the switch
  // goes through the site's ?lang= (a change reloads the page, translations load before the app).
  for (const lang of ['en', 'fr'] as const) {
    test(`shows its interface in the site language (${lang})`, { tag: '@mobile' }, async ({ page, compact }, testInfo) => {
      const l = LABELS[lang];
      const other = LABELS[lang === 'en' ? 'fr' : 'en'];
      await page.goto(`${DECKS}?tab=mine&lang=${lang}`);
      await expect(page.locator('.ac-plugin-root')).toBeVisible();
      // A guest without decks lands on « Communauté »; on « Mes decks » the list is empty (hidden on mobile), the guest notice is shown.
      await expect(page.getByRole('list', { name: l.myDecks })).toBeAttached();
      await expect(page.getByText(l.guest)).toBeVisible();
      if (!compact) await expect(page.getByText(l.sortBy, { exact: true })).toBeVisible();
      await expect(page.getByText(other.guest)).toHaveCount(0);

      await decksTab(page, compact, l.community, lang).click();
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
  test('shows the Uniques at most 7 per row, larger, on a very wide window', async ({ page, compact }) => {
    test.skip(compact, 'a desktop width');
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, `E2E uniques grid ${Date.now()}`);
    const columns = () => page.locator('ac-virtual-grid.grid').evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    const all = await columns();
    await page.getByRole('tab', { name: 'Uniques' }).click();
    await expect(page.locator('ac-unique-card').first()).toBeVisible();
    expect(all).toBeGreaterThan(7);
    await expect.poll(columns).toBe(7);
  });

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

    /** Checks `text` (exact) in the criterion `index` of the open effect window: its list stays open. */
    const pick = async (index: number, text: string) => {
      const dialog = page.getByRole('dialog');
      // Anywhere on the criterion's card opens it, its values too (« Tous les déclencheurs »…), not only its title.
      const card = dialog.locator('.card').nth(index);
      const box = (await card.boundingBox())!;
      await card.click({ position: { x: 24, y: box.height - 12 } });
      await expect(card.locator('.card-head')).toHaveAttribute('aria-pressed', 'true');
      await dialog.locator('ac-check-list input[type=search]').fill(text);
      await dialog.getByRole('checkbox', { name: text, exact: true }).check();
      await expect(dialog.locator('.card').nth(index).locator('ac-or-values .value').filter({ hasText: text })).toBeVisible();
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

    // « Dupliquer » puts a copy of the effect right after it.
    const summaries = page.locator('ac-effect-summary');
    const firstText = await summaries.nth(0).locator('p').allTextContents();
    await summaries.nth(0).getByRole('button', { name: 'Dupliquer Effet 1' }).click();
    await expect(summaries).toHaveCount(3);
    expect(await summaries.nth(1).locator('p').allTextContents()).toEqual(firstText);
  });

  test('narrows each effect list to the values that still give a card, for the effect being edited', { tag: '@mobile' }, async ({ page, compact }, testInfo) => {
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, `E2E uniques narrowing ${Date.now()}`);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Uniques' }).click();
    await expect(page.locator('ac-unique-card').first()).toBeVisible();
    if (compact) await page.getByRole('button', { name: /^Filtres/ }).first().click();

    const narrowing = (editing: string) =>
      page.waitForResponse((r) => r.url().includes('/api/v2/effects/filtered') && new URL(r.url()).searchParams.get('editing') === editing);
    const idGds = async (res: Promise<{ json(): Promise<unknown> }>) => ((await (await res).json()) as { idGds: number[] }).idGds;
    const dialog = () => page.getByRole('dialog');
    /** Shows the checkbox list of the criterion `index`: the right column, or a step in compact. */
    const openCriterion = async (index: number) => {
      await dialog().locator(compact ? '.crit .add' : '.card-head').nth(index).click();
      await expect(dialog().locator('ac-check-list')).toBeVisible();
    };
    /** Compact: back from the step to the criteria. */
    const closeCriterion = async () => {
      if (compact) await dialog().getByRole('button', { name: 'Valider' }).click();
    };
    /** Options of the criterion `index` of the open effect window. */
    const listed = async (index: number) => {
      await openCriterion(index);
      const options = dialog().locator('ac-check-list .option');
      await options.first().waitFor();
      const texts = await options.allTextContents();
      await closeCriterion();
      return texts;
    };
    const apply = async () => {
      await page.getByRole('dialog').getByRole('button', { name: 'Appliquer' }).click();
      if (!compact) await expect(page.getByRole('dialog')).toBeHidden();
    };
    const addEffect = () => page.getByRole('button', { name: 'Ajouter un effet' }).click();

    // Effect 1, nothing else picked: its triggers are those of the hero's faction.
    const first = narrowing('trigger:0');
    await addEffect();
    const factionIds = await idGds(first);
    expect(factionIds.length).toBeGreaterThan(0);
    // The whole list shows until the answer comes, then only the ids it holds.
    await expect.poll(async () => (await listed(0)).length).toBeLessThanOrEqual(factionIds.length);
    const allTriggers = await listed(0);
    await openCriterion(2);
    await dialog().locator('ac-check-list input[type=search]').fill('Piochez deux cartes.');
    await dialog().getByRole('checkbox', { name: 'Piochez deux cartes.', exact: true }).check();
    await closeCriterion();
    await apply();

    // Effect 2: slot 1, effect 1 sent as a constraint, the new block empty.
    const second = narrowing('trigger:1');
    await addEffect();
    const req = new URL((await second).url());
    expect(req.searchParams.get('effect[0][o]')).toBeTruthy();
    expect([...req.searchParams.keys()].filter((k) => k.startsWith('effect[1]'))).toEqual([]);
    const ids = await idGds(second);
    await expect.poll(async () => (await listed(0)).length).toBeLessThanOrEqual(ids.length);
    const narrowed = await listed(0);
    expect(narrowed.length).toBeGreaterThan(0);
    expect(narrowed.length).toBeLessThan(allTriggers.length);
    await openCriterion(0);
    await evidence(page, testInfo, '14-uniques-effect-narrowed');
    await dialog().locator('ac-check-list input[type=checkbox]').first().check();
    await closeCriterion();
    await apply();

    // Effect 1 removed: the one left is slot 0 again, and its own trigger does not narrow its trigger list
    // (the checked trigger stays in the list, checked).
    await page.locator('ac-effect-summary').first().getByRole('button', { name: /^Supprimer/ }).click();
    await expect(page.locator('ac-effect-summary')).toHaveCount(1);
    const again = narrowing('trigger:0');
    await page.locator('ac-effect-summary').first().getByRole('button').first().click();
    const reqAgain = new URL((await again).url());
    expect(reqAgain.searchParams.get('effect[0][t]')).toBeTruthy();
    expect([...reqAgain.searchParams.keys()].filter((k) => k.startsWith('effect[1]'))).toEqual([]);
    await again;
    await expect.poll(async () => (await listed(0)).length).toBe(allTriggers.length);
  });
});

test.describe('ReBuilder in the shell · card filters', () => {
  test('checks several subtypes in a row: the list stays open', { tag: '@mobile' }, async ({ page, compact }, testInfo) => {
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, `E2E sous-types ${Date.now()}`);
    await expect(page.locator('ac-card-tile').first()).toBeVisible();
    if (compact) await page.getByRole('button', { name: /^Filtres/ }).first().click();
    const filters = compact ? page.getByRole('dialog', { name: 'Filtres' }) : page.getByRole('complementary', { name: 'Filtres' });
    await filters.getByRole('button', { name: 'Recherche avancée' }).click();
    const subtypes = filters.locator('ac-combobox');
    await subtypes.getByRole('combobox', { name: 'Ajouter…' }).click();
    const options = page.getByRole('listbox', { name: 'Ajouter…' }).getByRole('option');
    await options.nth(0).click();
    await options.nth(1).click();
    await expect(page.getByRole('listbox', { name: 'Ajouter…' }).getByRole('option', { selected: true })).toHaveCount(2);
    await expect(subtypes.locator('.picked')).toHaveCount(2);
    await evidence(page, testInfo, '12-subtypes');
    // The button closes the list; the two subtypes make one filter.
    await subtypes.getByRole('combobox', { name: 'Ajouter…' }).click();
    await expect(page.getByRole('listbox', { name: 'Ajouter…' })).toBeHidden();
    if (compact) await filters.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByText('2 sous-types').first()).toBeVisible();
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
    // The filters stay in the URL, and a shared URL opens the same list.
    await expect(page).toHaveURL(/tab=contest/);
    await expect(page).toHaveURL(/set=all/);
    await expect(page).toHaveURL(/q=Akesha/);
    await page.goto(`${DECKS}?tab=contest&set=all&faction=YZ&lang=fr`);
    await expect(list.locator('ac-deck-card')).toHaveCount(26);
    // A contest deck is a public deck of the decks API, opened like any other.
    await expect(list.locator('ac-deck-card').first().getByRole('link').first()).toHaveAttribute("href", /\/pages\/deck\?id=[0-9a-f-]{36}$/);
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
    for (const expected of ['1 deck importé', '1 déjà existant']) {
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

test.describe('ReBuilder in the shell · deck page', () => {
  /** Creates a deck of alice's account through the relay (9 cards: not legal, the API says why), plus `extra` references. */
  async function createServerDeck(page: Page, name: string, extra: string[] = []): Promise<string> {
    return page.evaluate(async ([deckName, more]) => {
      const host = (window as unknown as { AlteredCore: { csrf: string; services: { decks: string } } }).AlteredCore;
      const res = await fetch(`${host.services.decks}/api/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': host.csrf },
        body: JSON.stringify({
          name: deckName,
          description: 'Première ligne\nDeuxième ligne',
          format: 'standard',
          isPublic: false,
          deckCards: [
            { cardReference: 'ALT_CORE_B_AX_01_C', quantity: 1 },
            { cardReference: 'ALT_CORE_B_AX_08_C', quantity: 3 },
            { cardReference: 'ALT_CORE_B_AX_09_C', quantity: 3 },
            { cardReference: 'ALT_CORE_B_AX_10_C', quantity: 3 },
            ...more.map((cardReference) => ({ cardReference, quantity: 1 })),
          ],
        }),
      });
      if (res.status !== 201) throw new Error(`deck creation: HTTP ${res.status}`);
      return ((await res.json()) as { id: string }).id;
    }, [name, extra] as const);
  }

  /** Deck page tab (desktop tabs) or bottom navigation entry (mobile). */
  async function openView(page: Page, compact: boolean, tab: string, nav: string): Promise<void> {
    if (compact) await page.getByRole('navigation', { name: 'Consultation du deck' }).getByRole('link', { name: nav }).click();
    else await page.getByRole('tab', { name: tab }).click();
  }

  test('shows the API legality, description and a test hand; shares and duplicates on the account', { tag: '@mobile' }, async ({ page, compact, baseURL }, testInfo) => {
    // navigator.share is recorded: sharing must never use the system share sheet.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => void ((window as unknown as { __shared: ShareData }).__shared = data),
      });
    });
    const name = `E2E page ${testInfo.project.name} ${Date.now()}`;
    await login(page, 'alice', `${DECKS}?lang=fr`);
    const id = await createServerDeck(page, name);
    await page.goto(DECK(id));
    const deckPage = page.locator('app-deck-page');
    await expect(deckPage).toContainText(name);

    // Legality from the decks API, with its details.
    await deckPage.getByRole('button', { name: 'Non légal : voir le détail' }).first().click();
    const legality = page.getByRole('dialog', { name: 'Légalité du deck' });
    await expect(legality).toContainText('Standard');
    await expect(legality).toContainText('Nombre de cartes invalide');
    await expect(legality).toContainText('Deck must contain between 39 and 59 cards');
    await evidence(page, testInfo, '20-deck-legality');
    await page.keyboard.press('Escape');
    await expect(legality).toBeHidden();

    await openView(page, compact, 'Description', 'Infos');
    await expect(page).toHaveURL(at(`${DECK(id)}&tab=description`));
    await expect(deckPage).toContainText('Première ligne');
    await expect(deckPage).toContainText('Deuxième ligne');
    await evidence(page, testInfo, '21-deck-description');

    await openView(page, compact, 'Main de départ', 'Main');
    await expect(page).toHaveURL(at(`${DECK(id)}&tab=main`));
    const hand = deckPage.getByRole('list', { name: 'Main de départ' });
    await expect(hand.locator('ac-card-tile')).toHaveCount(6);
    await expect(deckPage).toContainText('3 cartes dans le deck');
    await deckPage.getByRole('button', { name: 'Piocher une carte' }).click();
    await expect(hand.locator('ac-card-tile')).toHaveCount(7);
    // Opening-hand stats and calculators, under the hand (as on the site).
    await expect(deckPage.locator('app-hand-stats')).toContainText('Composition moyenne');
    await expect(deckPage.locator('app-hand-stats')).toContainText('Démarrage optimal');
    const calc = deckPage.locator('app-hand-calculators');
    await calc.getByRole('combobox', { name: 'Choisir…', exact: true }).click();
    // The list stays open: several cards are checked in a row.
    await page.getByRole('option').first().click();
    await page.getByRole('option').nth(1).click();
    await expect(page.getByRole('option', { selected: true })).toHaveCount(2);
    await expect(calc.locator('ac-probability-bars').first()).toContainText('%');
    await evidence(page, testInfo, '23-deck-test-hand');
    await page.keyboard.press('Escape');
    // Game mode (the site's playground, desktop only): 3 cards to mana, then a card played from its menu.
    if (!compact) {
      await deckPage.getByRole('button', { name: 'Mode jeu' }).click();
      for (const i of [0, 1, 2]) await deckPage.getByRole('button', { name: /: mettre en mana$/ }).nth(i).click();
      await deckPage.getByRole('button', { name: /Mettre en mana/ }).click();
      await expect(deckPage.getByRole('button', { name: 'Cartes en mana' })).toContainText('3');
      await deckPage.getByRole('button', { name: /: actions$/ }).first().click();
      await page.getByRole('menuitem', { name: 'Jouer sur le plateau' }).click();
      await expect(deckPage.getByRole('region', { name: 'En jeu' }).locator('ac-card-tile')).toHaveCount(1);
      await deckPage.getByRole('button', { name: 'Mode jeu' }).click();
    }

    // Share: the site's deck page link (/pages/deck?id=…), which opens Re:Builder or the site's page depending on the beta.
    // The deck is private: « Rendre public & partager » first, then the link and its QR code (as on the site).
    await deckPage.getByRole('button', { name: 'Partager', exact: true }).first().click();
    const share = page.getByRole('dialog', { name: 'Partager ce deck' });
    await expect(share).toContainText('Ce deck est privé');
    await share.getByRole('button', { name: 'Rendre public & partager' }).click();
    await expect(share.getByRole('textbox', { name: 'Lien' })).toHaveValue(`${baseURL}${DECK(id)}`);
    await expect(share.getByRole('img', { name: 'QR code du lien' })).toBeVisible();
    await evidence(page, testInfo, '24-deck-share');
    await page.keyboard.press('Escape');
    // Now public: the same window straight away (link and QR code), even where the browser has a system share sheet.
    await deckPage.getByRole('button', { name: 'Partager', exact: true }).first().click();
    await expect(share.getByRole('textbox', { name: 'Lien' })).toHaveValue(`${baseURL}${DECK(id)}`);
    await expect(share.getByRole('img', { name: 'QR code du lien' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __shared?: ShareData }).__shared)).toBeUndefined();
    await page.keyboard.press('Escape');

    // Duplicate: named copy, private deck of the account.
    if (compact) {
      await page.getByRole('button', { name: /Plus d’actions/ }).click();
      await page.getByRole('menuitem', { name: 'Dupliquer' }).click();
    } else {
      await deckPage.getByRole('button', { name: 'Dupliquer', exact: true }).click();
    }
    const dialog = page.getByRole('dialog', { name: 'Dupliquer le deck' });
    const field = dialog.getByRole('textbox', { name: 'Nom du nouveau deck' });
    await expect(field).toHaveValue(`${name} (copie)`);
    await field.fill(`${name} bis`);
    await evidence(page, testInfo, '24-deck-duplicate');
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/services/decks/api/decks');
    await dialog.getByRole('button', { name: 'Dupliquer', exact: true }).click();
    const res = await created;
    expect(res.status()).toBe(201);
    const copy = (await res.json()) as { id: string; isPublic: boolean };
    expect(copy.isPublic).toBe(false);
    // The copy is the user's: it opens in the editor, on « Aperçu ».
    await expect(page).toHaveURL(at(`${EDITOR(copy.id)}&view=apercu`));
    await expect(page.locator('app-editor-page')).toContainText(`${name} bis`);
    await page.goto(DECKS);
    await expect(page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: `${name} bis` })).toBeVisible();
  });

  test('keeps a unique\'s illustration once its printed effect arrives after it', async ({ page }, testInfo) => {
    // No support ability and a short effect: the same frame, so the same illustration URL, before and after the effect.
    const unique = 'ALT_ALIZE_B_AX_32_U_2';
    await login(page, 'alice', `${DECKS}?lang=fr`);
    const id = await createServerDeck(page, `E2E unique art ${Date.now()}`, [unique]);
    // A pile of the deck board from 768 px, a tile on phones.
    const tile = page.locator('ac-card-tile, ac-card-pile').filter({ has: page.locator('ac-unique-card') });
    // The cards API answers once the illustration is shown: the deck then replaces the unique's card object.
    await page.route('**/api/cards/batch**', async (route) => {
      await expect(tile.locator('ac-card-art')).toHaveClass(/\bloaded\b/);
      await route.continue();
    });
    await page.goto(DECK(id));
    await expect(tile.locator('.main-text')).not.toBeEmpty();
    await expect(tile.locator('ac-card-art')).toHaveClass(/\bloaded\b/);
    await expect(tile.locator('ac-card-art img')).toHaveCSS('opacity', '1');
    await evidence(page, testInfo, '26-unique-art');
  });

  test('numbers the copies 1, 2, 3 on a card\'s illustrations in Global alt-art mode', async ({ page }, testInfo) => {
    // Global mode for this page only: the mode is the account's, shared with the other tests.
    await page.route('**/api/alt-arts/preference-mode', (route) => route.fulfill({ json: { mode: 'Global' } }));
    await login(page, 'alice', `${DECKS}?lang=fr`);
    const id = await createServerDeck(page, `E2E alt arts ${Date.now()}`, ['ALT_CORE_B_AX_04_C']);
    await page.goto(DECK(id));
    await page.getByRole('button', { name: /^Agrandir Élémentaire de Kélon/ }).click();
    const slots = page.locator('app-alt-art-slots');
    await expect(slots.getByRole('button', { name: /^Exemplaire \d$/ })).toHaveText(['1', '2', '3']);
    await evidence(page, testInfo, '27-alt-art-copies');
  });

  test('names a public deck in the page title and link preview, also from a site-style link', async ({ page }) => {
    const res = await page.request.get('/api/v1/services/decks/api/decks/public', { params: { itemsPerPage: 1 }, headers: { Accept: 'application/json' } });
    const deck = ((await res.json()) as { member: { id: string; name: string }[] }).member[0];
    // Server-rendered for link previews (manifest `meta`), then kept by the app.
    const html = await (await page.request.get(`${DECK(deck.id)}&lang=fr`)).text();
    expect(html).toContain(`<meta property="og:title"       content="${deck.name.replace(/&/g, '&amp;')}">`);
    expect(html).toMatch(new RegExp(`<meta property="og:image"\\s+content="[^"]*/papi/core-altered-cards/deck-image\\?id=${deck.id}&amp;lang=fr&amp;v=`));
    // A former link of the plugin's own page: same title, on the site's URL.
    await page.goto(`/pages/rebuilder/deck?id=${deck.id}&lang=fr`);
    await expect(page).toHaveURL(at(DECK(deck.id), true));
    await expect(page).toHaveTitle(new RegExp(`^${escape(deck.name)} —`));
  });

  test('tells an unknown deck apart', async ({ page }, testInfo) => {
    await page.goto(`${DECK('00000000-0000-0000-0000-000000000000')}&lang=fr`);
    await expect(page.locator('app-deck-page').getByRole('alert')).toContainText('Deck introuvable.');
    await evidence(page, testInfo, '25-deck-not-found');
  });
});

test.describe('ReBuilder in the shell · guest', () => {
  test('lands on the community tab without guest decks, and keeps the filters of a site link', async ({ page, compact }) => {
    await page.goto(`${DECKS}?lang=fr`);
    await expect(decksTab(page, compact, FR.community)).toHaveAttribute(compact ? 'aria-current' : 'aria-selected', compact ? 'page' : 'true');
    await page.goto(`${DECKS}?tab=public&faction=MU&sort=name:asc&lang=fr`);
    await expect(page.getByRole('list', { name: FR.communityDecks }).locator('ac-deck-card').first()).toBeVisible();
    await expect(page).toHaveURL(/\/decks\?faction=MU&sort=name(&|$)/);
  });

  test('keeps a guest deck in this browser across reloads', async ({ page, compact }) => {
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, 'Deck invité');
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=guest-[^&]+$/);
    await addTwoCards(page);
    await expectDeckCount(page, compact, 2);
    // Saved in localStorage once the autosave delay is over: hero + 2 cards.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const decks = JSON.parse(localStorage.getItem('arb.guest-decks') ?? '[]') as { name: string; deckCards?: { quantity: number }[] }[];
          return (decks.find((d) => d.name === 'Deck invité')?.deckCards ?? []).reduce((n, l) => n + l.quantity, 0);
        }),
      )
      .toBe(3);
    await page.reload();
    await expectDeckCount(page, compact, 2);
    await page.goto(DECKS);
    await expect(page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: 'Deck invité' })).toBeVisible();
  });
});

test.describe('ReBuilder in the shell · « Partager » in the editor', () => {
  /** « Partager »: a button on desktop, an icon in the app bar on mobile. */
  const shareButton = (page: Page) => page.locator('app-editor-page').getByRole('button', { name: 'Partager', exact: true });

  test('saves the deck first, then shares it', { tag: '@mobile' }, async ({ page, compact }, testInfo) => {
    const name = `E2E share ${testInfo.project.name} ${Date.now()}`;
    await login(page, 'bob', `${DECKS}?lang=fr`);
    await page.getByRole('button', { name: FR.newDeck }).first().click();
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/services/decks/api/decks');
    await createDeck(page, name);
    const deck = (await (await created).json()) as { id: string };
    await expect(page).toHaveURL(at(EDITOR(deck.id)));

    // « Partager » right after a change: no wait for the autosave delay, the change is sent first.
    const saved = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/api/decks/${deck.id}`) && r.ok());
    await addTwoCards(page);
    // The deck bar counts the rarities the format caps (from 768 px).
    if (!compact) await expect(page.locator('app-deck-bar').getByRole('group', { name: 'Raretés limitées par le format' })).toContainText('/15');
    await shareButton(page).click();
    const patch = await saved;
    expect(((patch.request().postDataJSON() as { deckCards?: unknown[] }).deckCards ?? []).length).toBeGreaterThanOrEqual(2);
    const dialog = page.getByRole('dialog', { name: 'Partager ce deck' });
    await expect(dialog).toContainText('Deck enregistré : le lien affiche la dernière version.');
    // A new deck is private: « Rendre public & partager » first, then the link.
    await expect(dialog).toContainText('Ce deck est privé');
    await evidence(page, testInfo, '40-editor-share-saved');
    await dialog.getByRole('button', { name: 'Rendre public & partager' }).click();
    await expect(dialog.getByRole('textbox', { name: 'Lien' })).toHaveValue(new RegExp(`${escape(DECK(deck.id))}$`));
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // « Mes decks » of the deck bar leaves the editor (from 768 px; the app bar's back button on phones).
    if (!compact) {
      await page.locator('app-deck-bar').getByRole('link', { name: 'Mes decks' }).click();
      await expect(page).toHaveURL(/\/pages\/decks(\?|$)/);
      await expect(page.getByRole('list', { name: 'Mes decks' }).locator('ac-deck-card').filter({ hasText: name })).toBeVisible();
    }
  });

  test('a guest signs in to share: the deck moves to the account and the share window opens', async ({ page }, testInfo) => {
    const name = `E2E invité ${testInfo.project.name} ${Date.now()}`;
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, name);
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=guest-[^&]+$/);
    await addTwoCards(page);

    await shareButton(page).click();
    const prompt = page.getByRole('dialog', { name: 'Connectez-vous pour partager' });
    await expect(prompt).toContainText('Pour partager ce deck et l’enregistrer sur le serveur, connectez-vous.');
    await evidence(page, testInfo, '41-editor-share-sign-in');
    await prompt.getByRole('button', { name: 'Se connecter' }).click();

    // The site's Keycloak login, then back to the editor.
    await page.locator('#username').fill('bob');
    await page.locator('#password').fill('TestPassword1234');
    await page.locator('#kc-login').click();
    const dialog = page.getByRole('dialog', { name: 'Partager ce deck' });
    await expect(dialog).toContainText('Deck enregistré sur votre compte : vous pouvez le partager.');
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=(?!guest-)[^&]+$/);
    await evidence(page, testInfo, '42-editor-share-after-sign-in');
    // Removed from this device: one copy of the deck, on the account.
    const guests = await page.evaluate(() => (JSON.parse(localStorage.getItem('arb.guest-decks') ?? '[]') as { name: string }[]).map((d) => d.name));
    expect(guests).not.toContain(name);
    await page.keyboard.press('Escape');
    await expect(page.locator('app-editor-page')).toContainText('2');
  });
});

test.describe('ReBuilder in the shell · side panels of the editor', () => {
  test('hides the filters and the deck panel behind tabs on the page edges, remembered after a reload', async ({ page, compact }, testInfo) => {
    test.skip(compact, 'compact screens have no side panels: filters in a sheet, deck in the bottom navigation');
    await page.goto(`${NEW_DECK}?lang=fr`);
    await createDeck(page, `E2E panneaux ${Date.now()}`);
    await addTwoCards(page);
    const editor = page.locator('app-editor-page');
    const filters = editor.getByRole('complementary', { name: 'Filtres' });
    const deckPanel = editor.locator('app-deck-panel');
    await expect(filters).toBeVisible();
    await expect(deckPanel).toBeVisible();
    await evidence(page, testInfo, '50-panels-open');

    await editor.getByRole('button', { name: 'Masquer les filtres' }).click();
    await editor.getByRole('button', { name: 'Masquer le deck' }).click();
    await expect(filters).toBeHidden();
    await expect(deckPanel).toBeHidden();
    const filtersTab = editor.getByRole('button', { name: /^Afficher les filtres/ });
    const deckTab = editor.getByRole('button', { name: /^Afficher le deck : 2 cartes/ });
    await expect(filtersTab).toBeVisible();
    await expect(deckTab).toBeVisible();
    // The focus goes to the control that brings the panel back.
    await expect(deckTab).toBeFocused();
    await evidence(page, testInfo, '51-panels-closed');

    await page.reload();
    await expect(deckTab).toBeVisible();
    await expect(filters).toBeHidden();

    await filtersTab.click();
    await deckTab.click();
    await expect(filters).toBeVisible();
    await expect(deckPanel).toBeVisible();
    await expect(editor.getByRole('button', { name: 'Masquer le deck' })).toBeFocused();
  });
});
