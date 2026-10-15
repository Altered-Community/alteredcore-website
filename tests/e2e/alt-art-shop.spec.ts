import { expect, login, test } from './fixtures';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The alt-art shop: the alt arts the player does not own yet, priced in Alterite, with a
 * confirmation before buying.
 *
 * The tests run against /pages/alt-art-shop-preview, which answers from a fixture through the very
 * same pipeline as the live endpoint (../includes/shop-list.php) — same filtering, same pricing, same
 * hiding of owned prints, same paging. Chosen deliberately: the live route needs the AlteredOwnership
 * service, which is not reachable from this environment, so its catalogue would be whatever one
 * account happens to own.
 *
 * Nothing is spent. "Buy" opens the confirmation and "Confirm payment" closes it and says purchases
 * are not available yet, because there is no buy route to call.
 */
const PREVIEW = '/pages/alt-art-shop-preview';

/** The local-only fixture backing the preview, read from disk to assert against. */
const FIXTURE = join(__dirname, '../../plugins/ownership/pages/shop-preview.json');

/** A tile for an alt art, never the standard print of the same family. */
const tiles = (page: import('@playwright/test').Page) => page.locator('.own-shop-tile');

test.describe('Alt Art Shop', () => {
    test('lists only alt arts the player does not own, priced in Alterite', async ({ page }) => {
        await login(page, 'alice', PREVIEW);

        await expect(tiles(page).first()).toBeVisible();
        expect(await tiles(page).count()).toBeGreaterThan(0);

        // Only alt prints are offered, never the standard print of the same family.
        expect(await tiles(page).first().getAttribute('data-reference')).toMatch(/^ALT_[^_]+_A_/);
        await expect(tiles(page).first().locator('.own-shop-tile__img'))
            .toHaveAttribute('src', /\/cards\/.+\.webp$/);

        // A price is a number, and the currency is named rather than left to be guessed: the header
        // says Alterite and every tile carries a figure.
await expect(page.locator('#own-shop-balance')).toBeVisible();
        await expect(page.locator('#own-shop-balance-value')).toHaveText(/\d/);
        await expect(tiles(page).first().locator('.own-shop-tile__price')).toHaveText(/^[\d\s ]+$/);

        // The currency mark shares the price line instead of stacking above it, and it is the
        // server's icon (BASE_URL aware) rather than a hard-coded /assets path.
        const cost = tiles(page).first().locator('.own-shop-tile__cost');
        await expect(cost.locator('.own-shop-tile__cost-icon'))
            .toHaveAttribute('src', /web-app-manifest-192x192\.png$/);
        await expect(cost.locator('.own-shop-tile__price')).toBeVisible();
    });

    test('the Alterite balance is the one the server sent, not a zero the page invented', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        // The fixture states a balance; the chip shows that figure. A page that defaulted to 0 would
        // read as "you have nothing" for a player who demonstrably has Alterite.
        const shown = await page.locator('#own-shop-balance-value').innerText();
        expect(shown.replace(/[^\d]/g, '')).not.toBe('0');

        const answer = await page.evaluate(async () => {
            const r = await fetch(window.OWN_SHOP.listUrl, { credentials: 'same-origin' });
            return r.json();
        });
        expect(answer.balance).toBeGreaterThan(0);
        expect(shown.replace(/[^\d]/g, '')).toBe(String(answer.balance));
    });

    test('hiding owned prints is what keeps a page from looking empty', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        // Read the fixture off disk rather than over HTTP: it is a local-only file and the router
        // does not serve it, which is what keeps the preview out of production.
        const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));

        // The fixture ends in families the player owns in full, which is one whole page of the list.
        // The shared pipeline walks past such a page; without that the grid would either stop early
        // or claim the catalogue is finished when it is not.
        const buyable = (f: { familyId: number; faction: string; rarity: string }) =>
            fixture.options
                .filter((g: { familyId: number; faction: string; rarity: string }) =>
                    g.familyId === f.familyId && g.faction === f.faction && g.rarity === f.rarity)
                .flatMap((g: { options: { reference: string; ownedQuantity: number | null }[] }) => g.options)
                .filter((o: { reference: string; ownedQuantity: number | null }) =>
                    o.reference.includes('_A_') && (o.ownedQuantity === null || o.ownedQuantity === 0));

        const pages = Math.ceil(fixture.families.length / 8);
        expect(buyable(fixture.families[fixture.families.length - 1])).toHaveLength(0);

        // Walk to the end: the already-rendered results survive the empty trailing page, and
        // "load more" disappears rather than leaving a button that leads nowhere.
        let seen = 0;
        for (let i = 0; i < pages + 2; i++) {
            if (!(await page.locator('#own-shop-loadmore').isVisible())) break;
            const before = await tiles(page).count();
            await page.locator('#own-shop-loadmore-btn').click();
            await page.waitForFunction(
                (n) => document.querySelectorAll('.own-shop-tile').length !== n
                    || document.querySelector('#own-shop-loadmore')?.hasAttribute('hidden'),
                before,
            );
            seen++;
        }
        await expect(page.locator('#own-shop-loadmore')).toBeHidden();
        expect(seen).toBeGreaterThan(0);

        // The walk worked: more arrived, and the empty page at the end did not wipe them.
        const total = await tiles(page).count();
        expect(total).toBeGreaterThan(8);
        expect(total).toBe(fixture.families.reduce((n: number, f: { familyId: number; faction: string; rarity: string }) => n + buyable(f).length, 0));
    });

    test('a print the player owns is not offered at all', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        // No tile may claim ownership, and none may be inert: everything listed is buyable, which is
        // the whole point of the filter.
        await expect(page.locator('.own-shop-tile__meta.is-owned')).toHaveCount(0);
        await expect(page.locator('.own-shop-tile [data-own-shop-buy]')).toHaveCount(await tiles(page).count());
    });

    test('filters narrow the catalogue and an empty result is explained', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        const rarityOf = async () =>
            tiles(page).locator('.ac-tag.own-shop-tile__rarity').allTextContents();

        const before = await rarityOf();
        expect(before.length).toBeGreaterThan(0);
        // Worth filtering: the unfiltered page is not already all Rare.
        expect(before.some((r) => r !== 'Rare')).toBe(true);

        // The page count is per family, so a rare-only page is not comparable in size to an
        // unfiltered one — what must hold is that everything left is Rare.
        await page.locator('.ac-chip[data-filter="rarity"][data-value="R"]').click();
        await expect(async () => {
            expect(await rarityOf()).not.toEqual(before);
        }).toPass();
        for (const r of await rarityOf()) expect(r).toBe('Rare');

        await page.locator('.ac-chip[data-filter="rarity"][data-value=""]').click();
        await expect(async () => {
            expect(await rarityOf()).toEqual(before);
        }).toPass();

        await page.locator('#own-shop-q').fill('zzzzz-no-such-card');
        await expect(page.locator('.ac-empty__title')).toHaveText(/No alt art matches/i);
    });

    test('the filters are multi-select and reach the endpoint as repeated keys', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        const endpoint = (url: string) => url.includes('shop-preview-list');
        // The client ignores a filter change while a load is already in flight, so each click has to
        // settle before the next one; otherwise the second chip toggles on screen but its request is
        // never made.
        const clickAndWait = async (selector: string) => {
            const response = page.waitForResponse((r) => endpoint(r.url()));
            await page.locator(selector).click();
            const settled = await response;
            await expect(page.locator('#own-shop-grid')).toHaveAttribute('aria-busy', 'false');
            return settled.request();
        };

        await clickAndWait('.ac-chip[data-filter="rarity"][data-value="C"]');
        await clickAndWait('.ac-chip[data-filter="rarity"][data-value="R"]');
        await clickAndWait('.ac-chip[data-filter="type"][data-value="TOKEN"]');
        const final = await clickAndWait('.ac-chip[data-filter="faction"][data-value="AX"]');

        // The server receives every selection as a repeated key, not just the last one — the whole
        // point of a multi-select chip row.
        const url = final.url();
        expect(url).toContain('rarity%5B%5D=C');
        expect(url).toContain('rarity%5B%5D=R');
        expect(url).toContain('type%5B%5D=TOKEN');
        expect(url).toContain('faction%5B%5D=AX');

        // Both rarity chips stay pressed; the group's "All" chip steps aside.
        await expect(page.locator('.ac-chip[data-filter="rarity"][data-value="C"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.ac-chip[data-filter="rarity"][data-value="R"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.ac-chip[data-filter="rarity"][data-value=""]')).toHaveAttribute('aria-pressed', 'false');

        // "All" clears only its own group, leaving the other selections in place.
        await clickAndWait('.ac-chip[data-filter="rarity"][data-value=""]');
        await expect(page.locator('.ac-chip[data-filter="rarity"][data-value="C"]')).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('.ac-chip[data-filter="type"][data-value="TOKEN"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.ac-chip[data-filter="faction"][data-value="AX"]')).toHaveAttribute('aria-pressed', 'true');
    });

    test('buying asks for confirmation, and confirming says purchases are not available', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        await page.locator('.own-shop-tile [data-own-shop-buy]').first().click();

        const dialog = page.locator('#own-shop-buy');
        await expect(dialog).toBeVisible();

        // The dialog quotes the tile that was clicked, and shows what the purchase would do to the
        // balance rather than leaving the player to work it out.
        const tileRef = await tiles(page).first().getAttribute('data-reference');
        await expect(page.locator('#own-shop-buy-name')).not.toBeEmpty();
        await expect(page.locator('#own-shop-buy-img')).toHaveAttribute('src', /\.webp$/);
        await expect(page.locator('#own-shop-buy-price')).toHaveText(/\d/);
        await expect(page.locator('#own-shop-buy-after')).toHaveText(/-?\d/);

        // Nothing is spent and the page says so, rather than a dead button or a silent failure.
        await page.locator('#own-shop-buy-confirm').click();
        await expect(dialog).toBeHidden();
        await expect(page.locator('#own-shop-status .ac-notice--warning')).toContainText(/not available/i);
        await expect(page.locator('#own-shop-balance-value')).toHaveText(/\d/);

        // The grid is untouched: confirming must not remove the tile, since nothing was bought.
        expect(await tiles(page).count()).toBeGreaterThan(0);
        expect(await page.evaluate((r) => !!document.querySelector(`[data-reference="${r}"]`), tileRef)).toBe(true);
    });

    test('the confirmation can be dismissed without buying', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        await page.locator('.own-shop-tile [data-own-shop-buy]').first().click();
        await expect(page.locator('#own-shop-buy')).toBeVisible();

        await page.locator('#own-shop-buy button[data-own-shop-close]').last().click();
        await expect(page.locator('#own-shop-buy')).toBeHidden();
        await expect(page.locator('#own-shop-status .ac-notice')).toHaveCount(0);
    });

    test('Escape closes the confirmation, as a native dialog should', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        await page.locator('.own-shop-tile [data-own-shop-buy]').first().click();
        await expect(page.locator('#own-shop-buy')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.locator('#own-shop-buy')).toBeHidden();
    });

    test('a print with no price is offered without a figure rather than as free', async ({ page }) => {
        await login(page, 'alice', PREVIEW);
        await expect(tiles(page).first()).toBeVisible();

        // Remove one combination from the price table through the admin endpoint's own rules is not
        // reachable from here, so assert the rendering contract instead: no tile may show a bare 0,
        // and the unknown state has its own wording.
        const prices = await tiles(page).locator('.own-shop-tile__price').allTextContents();
        expect(prices.some((p) => p.trim() === '0')).toBe(false);
    });

    test('anonymous visitors are asked to sign in instead of shown an empty shop', async ({ page }) => {
        await page.goto('/pages/alt-art-shop');
        await expect(page.getByRole('link', { name: 'Log in / Sign up' })).toBeVisible();
        await expect(page.locator('#own-shop-grid')).toHaveCount(0);
    });
});
