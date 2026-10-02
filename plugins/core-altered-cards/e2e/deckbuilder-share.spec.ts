import { evidence, expect, login, setBeta, test, type Page } from '../../../tests/e2e/fixtures';

/**
 * Site deck builder (plugin core-altered-cards, « Beta Deckbuilder » off): « Partager » and « Terminer » save the deck
 * first, then open the share window or the deck page; a guest signs in to share, and the browser deck moves to the
 * account. Against the local stack (Keycloak session of the site, decks API).
 */

const EDITOR = (id: string) => `/pages/deckbuilder?id=${id}`;
const DECK = (id: string) => `/pages/deck?id=${id}`;
const HERO = { cardReference: 'ALT_CORE_B_AX_01_C', name: 'Sierra & Oddball', factionCode: 'AX' };

/** A private deck of the signed-in user, created through Re:Builder's relay (window.AlteredCore, beta pages only). */
async function createServerDeck(page: Page, name: string): Promise<string> {
  await setBeta(page, true);
  await page.goto('/pages/decks?lang=fr');
  await page.waitForFunction(() => !!(window as unknown as { AlteredCore?: unknown }).AlteredCore);
  const id = await page.evaluate(async (deckName) => {
    const host = (window as unknown as { AlteredCore: { csrf: string; services: { decks: string } } }).AlteredCore;
    const res = await fetch(`${host.services.decks}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': host.csrf },
      body: JSON.stringify({
        name: deckName,
        format: 'standard',
        isPublic: false,
        deckCards: [
          { cardReference: 'ALT_CORE_B_AX_01_C', quantity: 1 },
          { cardReference: 'ALT_CORE_B_AX_08_C', quantity: 3 },
        ],
      }),
    });
    if (res.status !== 201) throw new Error(`deck creation: HTTP ${res.status}`);
    return ((await res.json()) as { id: string }).id;
  }, name);
  await setBeta(page, false);
  return id;
}

/** « Partager »: next to the title from 768 px, in the status strip on phones. */
function shareButton(page: Page, compact: boolean) {
  return compact ? page.locator('.db-ss-strip').getByRole('button', { name: 'Partager' }) : page.locator('.db-title-actions').getByRole('button', { name: 'Partager' });
}

/** The deck name field: in the « Deck » tab on phones. */
async function rename(page: Page, compact: boolean, name: string): Promise<void> {
  if (compact) await page.locator('.db-mobile-tab[data-tab="deck"]').click();
  await page.locator('#db-deck-name').fill(name);
}

const saveRequest = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/pages/deckbuilder?ajax=1') && r.ok());

test.describe('Site deck builder · « Partager » and « Terminer »', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`saves the deck first, shares it, then opens the deck page (${theme})`, async ({ page, compact }, testInfo) => {
      const name = `E2E legacy ${testInfo.project.name} ${theme} ${Date.now()}`;
      await login(page, 'bob', '/pages/decks?lang=fr');
      const id = await createServerDeck(page, name);
      await page.goto(`${EDITOR(id)}&lang=fr&theme=${theme}`);
      await expect(page.locator('#db-deck-name')).toHaveValue(name);
      await evidence(page, testInfo, `50-legacy-editor-${theme}`);
      // The status strip stays in view while the cards scroll (sticky), in both themes.
      await page.evaluate(() => window.scrollTo(0, 1400));
      await expect(page.locator('.db-ss-strip')).toBeInViewport();
      await evidence(page, testInfo, `50-legacy-editor-${theme}-scrolled`);
      await page.evaluate(() => window.scrollTo(0, 0));

      // A change, then « Partager » at once: the save is sent first (no wait for the 5 s autosave).
      await rename(page, compact, `${name} bis`);
      const saved = saveRequest(page);
      await shareButton(page, compact).click();
      const body = (await saved).request().postData() ?? '';
      expect(body).toContain(`${name} bis`);
      const dialog = page.locator('#dbShareModal');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Deck sauvegardé : le lien affiche la dernière version.');
      // Private: « Rendre public & partager » first; it sets the editor's visibility and saves.
      await expect(dialog).toContainText('Ce deck est privé');
      const madePublic = saveRequest(page);
      await dialog.getByRole('button', { name: 'Rendre public & partager' }).click();
      expect((await madePublic).request().postData() ?? '').toContain('"isPublic":true');
      await expect(dialog.locator('#db-share-url')).toHaveValue(new RegExp(`/pages/deck\\?id=${id}$`));
      await expect(dialog.locator('#db-share-qr canvas, #db-share-qr img').first()).toBeAttached();
      await evidence(page, testInfo, `51-legacy-share-${theme}`);
      await dialog.getByRole('button', { name: 'Annuler' }).click();
      await expect(dialog).toBeHidden();

      await page.locator('#db-done-btn').click();
      await expect(page).toHaveURL(new RegExp(`${DECK(id).replace('?', '\\?')}$`));
      await expect(page.locator('body')).toContainText(`${name} bis`);
    });
  }

  test('stops on a failed save and carries the action on with « Réessayer »', async ({ page, compact }, testInfo) => {
    const name = `E2E legacy error ${testInfo.project.name} ${Date.now()}`;
    await login(page, 'bob', '/pages/decks?lang=fr');
    const id = await createServerDeck(page, name);
    await page.goto(`${EDITOR(id)}&lang=fr`);
    await expect(page.locator('#db-deck-name')).toHaveValue(name);
    await rename(page, compact, `${name} ter`);
    await page.route('**/pages/deckbuilder?ajax=1', (route) => route.abort());
    await shareButton(page, compact).click();
    const error = page.locator('#db-action-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Erreur de connexion.');
    await expect(error).toContainText('Le partage s’ouvrira une fois le deck sauvegardé.');
    await expect(page.locator('#dbShareModal')).toBeHidden();
    await evidence(page, testInfo, '52-legacy-save-error');
    await page.unroute('**/pages/deckbuilder?ajax=1');
    await error.getByRole('button', { name: 'Réessayer' }).click();
    await expect(page.locator('#dbShareModal')).toContainText('Deck sauvegardé');
    await expect(error).toBeHidden();
  });

  test('a guest signs in to share: the browser deck moves to the account, then the share window opens', async ({ page, compact }, testInfo) => {
    const name = `E2E legacy guest ${testInfo.project.name} ${Date.now()}`;
    await setBeta(page, false);
    await page.addInitScript(([deckName, hero]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('alteredcore_guest_deck', JSON.stringify({
        name: deckName, format: 'standard', hero,
        cards: { ALT_CORE_B_AX_08_C: { qty: 2, name: 'Carte', type: 'CHARACTER' } },
      }));
    }, [name, HERO] as const);
    await page.goto('/pages/deckbuilder?lang=fr');
    await expect(page.locator('#db-deck-name')).toHaveValue(name);
    // No deck page for a guest deck: « Terminer » is not offered.
    await expect(page.locator('#db-done-btn')).toHaveCount(0);

    await shareButton(page, compact).click();
    const prompt = page.locator('#dbSignInShareModal');
    await expect(prompt).toContainText('Pour partager ce deck et l’enregistrer sur le serveur, connectez-vous.');
    await evidence(page, testInfo, '53-legacy-guest-sign-in');
    await prompt.getByRole('link', { name: 'Se connecter' }).click();

    await page.locator('#username').fill('bob');
    await page.locator('#password').fill('TestPassword1234');
    await page.locator('#kc-login').click();
    const dialog = page.locator('#dbShareModal');
    await expect(dialog).toContainText('Deck sauvegardé sur votre compte : vous pouvez le partager.');
    await expect(page).toHaveURL(/\/pages\/deckbuilder\?id=[^&]+$/);
    await expect(page.locator('#db-deck-name')).toHaveValue(name);
    await evidence(page, testInfo, '54-legacy-guest-saved-to-account');
    expect(await page.evaluate(() => localStorage.getItem('alteredcore_guest_deck'))).toBeNull();
  });
});
