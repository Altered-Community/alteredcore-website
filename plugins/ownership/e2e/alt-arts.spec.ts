import { evidence, expect, login, test, type Page } from '../../../tests/e2e/fixtures';

const KELON = { base: 'ALT_CORE_B_AX_04_C', alt: 'ALT_COREKS_B_AX_04_C' };
const SCARABOT = { base: 'ALT_CORE_B_AX_31_C', alt: 'ALT_CORE_A_AX_31_C' };

/**
 * The page's search (`/papi/ownership/alt-art-search`) answers two families: Élémentaire de Kélon (the plain print and
 * an alt art owned once, the three cards on the plain print) and the Scarabot token (one card). The choices saved
 * (`/papi/ownership/alt-art-set-preference`) are kept here and answered without the service.
 */
async function routeAltArts(page: Page): Promise<string[][]> {
  const family = (familyId: number, cardType: string, name: string, refs: { base: string; alt: string }, cards: number) => ({
    family: { familyId, faction: 'AX', rarity: 'C', cardType, name, reference: refs.base },
    options: {
      familyId,
      faction: 'AX',
      rarity: 'C',
      options: [
        { reference: refs.base, ownedQuantity: null },
        { reference: refs.alt, ownedQuantity: 1 },
      ],
      slots: Array.from({ length: cards }, (_, i) => ({ slotIndex: i + 1, reference: refs.base, isExplicitChoice: false })),
    },
  });
  const kelon = family(1, 'CHARACTER', 'Élémentaire de Kélon', KELON, 3);
  const scarabot = family(2, 'TOKEN', 'Scarabot', SCARABOT, 1);
  await page.route('**/papi/ownership/alt-art-search**', (route) =>
    route.fulfill({
      json: {
        families: [kelon.family, scarabot.family],
        options: { '1:AX:C': kelon.options, '2:AX:C': scarabot.options },
        hasMore: false,
      },
    }),
  );
  const saved: string[][] = [];
  await page.route('**/papi/ownership/alt-art-set-preference', async (route) => {
    saved.push((route.request().postDataJSON() as { slotReferences: string[] }).slotReferences);
    await route.fulfill({ status: 204 });
  });
  return saved;
}

test('chooses the default alt arts with the keys above each illustration', { tag: '@mobile' }, async ({ page }, testInfo) => {
  const saved = await routeAltArts(page);
  await login(page, 'alice', '/pages/ownership-alt-arts?lang=fr');
  const kelon = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Élémentaire de Kélon' }) });
  const key = (n: number, card: string) => kelon.getByRole('group', { name: `Cartes de Illustration ${n}` }).getByRole('button', { name: card });
  // The three cards take the plain print.
  for (const card of ['1ère carte', '2ème carte', '3ème carte']) {
    await expect(key(1, card)).toHaveAttribute('aria-pressed', 'true');
    await expect(key(2, card)).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(kelon.getByText('Une carte ajoutée à un deck prend')).toBeVisible();
  // The 1st card takes the alt art: saved, and the fan shows it first.
  await key(2, '1ère carte').click();
  await expect.poll(() => saved.at(-1)).toEqual([KELON.alt, KELON.base, KELON.base]);
  await expect(key(2, '1ère carte')).toHaveAttribute('aria-pressed', 'true');
  await expect(key(1, '1ère carte')).toHaveAttribute('aria-pressed', 'false');
  await expect(kelon.locator('.own-aa-fan img').first()).toHaveAttribute('src', new RegExp(KELON.alt));
  // Its only copy owned is on the 1st card: the other cards cannot take it.
  await expect(key(2, '2ème carte')).toBeDisabled();
  await expect(key(2, '3ème carte')).toBeDisabled();
  // A token has one key an illustration.
  const scarabot = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Scarabot' }) });
  await expect(scarabot.getByText('Tous vos decks utilisent')).toBeVisible();
  await scarabot.getByRole('button', { name: 'Choisir Illustration 2' }).click();
  await expect.poll(() => saved.at(-1)).toEqual([SCARABOT.alt]);
  await expect(scarabot.getByRole('button', { name: 'Choisir Illustration 2' })).toHaveText('Choisie');
  await kelon.scrollIntoViewIfNeeded();
  await evidence(page, testInfo, '40-default-alt-arts-keys');
});
