import { evidence, expect, login, test, type Page } from '../../../tests/e2e/fixtures';

const FEE = { base: 'ALT_CORE_B_AX_09_C', alt: 'ALT_MUSUBI_B_AX_09_C' };
const SCARABOT = { base: 'ALT_CORE_B_AX_31_C', alt: 'ALT_CORE_A_AX_31_C' };

/**
 * The page's search (`/papi/ownership/alt-art-search`) answers two families: Fée Clochette (the plain print and
 * an alt art owned once, the three cards on the plain print) and the Scarabot token (one card). The choices saved
 * (`/papi/ownership/alt-art-set-preference`) are kept here and answered without the service (204, or `answer`).
 */
async function routeAltArts(page: Page, answer: { status: number; json?: unknown } = { status: 204 }): Promise<string[][]> {
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
  const fee = family(1, 'CHARACTER', 'Fée Clochette', FEE, 3);
  const scarabot = family(2, 'TOKEN', 'Scarabot', SCARABOT, 1);
  await page.route('**/papi/ownership/alt-art-search**', (route) =>
    route.fulfill({
      json: {
        families: [fee.family, scarabot.family],
        options: { '1:AX:C': fee.options, '2:AX:C': scarabot.options },
        hasMore: false,
      },
    }),
  );
  const saved: string[][] = [];
  await page.route('**/papi/ownership/alt-art-set-preference', async (route) => {
    saved.push((route.request().postDataJSON() as { slotReferences: string[] }).slotReferences);
    await route.fulfill(answer);
  });
  return saved;
}

test('chooses the default alt arts with the keys above each illustration', { tag: '@mobile' }, async ({ page }, testInfo) => {
  const saved = await routeAltArts(page);
  await login(page, 'alice', '/pages/ownership-alt-arts?lang=fr');
  const fee = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Fée Clochette' }) });
  const key = (n: number, card: string) => fee.getByRole('group', { name: `Cartes de Illustration ${n}` }).getByRole('button', { name: card });
  // The three cards take the plain print.
  for (const card of ['1ère carte', '2ème carte', '3ème carte']) {
    await expect(key(1, card)).toHaveAttribute('aria-pressed', 'true');
    await expect(key(2, card)).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(fee.getByText('Une carte ajoutée à un deck prend')).toBeVisible();
  // The 1st card takes the alt art: saved, and the fan shows it first.
  await key(2, '1ère carte').click();
  await expect.poll(() => saved.at(-1)).toEqual([FEE.alt, FEE.base, FEE.base]);
  await expect(key(2, '1ère carte')).toHaveAttribute('aria-pressed', 'true');
  await expect(key(1, '1ère carte')).toHaveAttribute('aria-pressed', 'false');
  await expect(fee.locator('.own-aa-fan img').first()).toHaveAttribute('src', new RegExp(FEE.alt));
  await expect(fee.getByRole('img', { name: '1ère carte : Illustration 2, 2ème carte : Illustration 1, 3ème carte : Illustration 1' })).toBeVisible();
  // Its only copy owned is on the 1st card: the other cards cannot take it.
  await expect(key(2, '2ème carte')).toBeDisabled();
  await expect(key(2, '3ème carte')).toBeDisabled();
  // A token has one key an illustration.
  const scarabot = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Scarabot' }) });
  await expect(scarabot.getByText('Tous vos decks utilisent')).toBeVisible();
  const token = scarabot.getByRole('group', { name: 'Cartes de Illustration 2' }).getByRole('button');
  await token.click();
  await expect.poll(() => saved.at(-1)).toEqual([SCARABOT.alt]);
  await expect(token).toHaveAccessibleName('Choisie');
  await expect(token).toHaveAttribute('aria-pressed', 'true');
  await fee.scrollIntoViewIfNeeded();
  await evidence(page, testInfo, '40-default-alt-arts-keys');
});

test('puts the keys back when the service refuses a choice', async ({ page }) => {
  const saved = await routeAltArts(page, { status: 409, json: [{ reference: FEE.alt, requested: 2, owned: 1 }] });
  await login(page, 'alice', '/pages/ownership-alt-arts?lang=fr');
  const fee = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Fée Clochette' }) });
  const key = (n: number, card: string) => fee.getByRole('group', { name: `Cartes de Illustration ${n}` }).getByRole('button', { name: card });
  await key(2, '1ère carte').click();
  await expect.poll(() => saved.at(-1)).toEqual([FEE.alt, FEE.base, FEE.base]);
  // Refused: the 1st card takes the plain print again, the fan with it, and the reason is shown.
  await expect(fee.getByRole('alert')).toContainText(`${FEE.alt} (2/1)`);
  await expect(key(1, '1ère carte')).toHaveAttribute('aria-pressed', 'true');
  await expect(key(2, '1ère carte')).toHaveAttribute('aria-pressed', 'false');
  await expect(fee.locator('.own-aa-fan img').first()).toHaveAttribute('src', new RegExp(FEE.base));
});
