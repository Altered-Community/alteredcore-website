import { DECKS_API, csrfOf, expect, login, test } from './fixtures';

/** The shell's side of manifest v2: routing, host contract, session token. Plugin-agnostic. */
test.describe('Shell · SPA pages', () => {
  test('deep links reach SPA pages only; PHP pages keep a single URL', async ({ request }) => {
    for (const path of ['/pages/deckbuilder', '/pages/deckbuilder/decks/new', '/pages/deckbuilder/any/deep/path']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(await res.text()).toContain('data-ac-plugin="rebuilder"');
    }
    expect((await request.get('/pages/decks/anything')).status()).toBe(404);
    expect((await request.get('/pages/news/anything')).status()).toBe(404);
    expect((await request.get('/pages/decks')).status()).toBe(200);
    expect((await request.get('/pages/deckbuilder-legacy')).status()).toBe(200);
  });

  test('publishes window.AlteredCore v1 and isolates the plugin in a shadow root', async ({ page }) => {
    await page.goto('/pages/deckbuilder?lang=fr');
    const host = await page.evaluate(() => {
      const ac = (window as unknown as { AlteredCore: Record<string, unknown> & { page: Record<string, string> } }).AlteredCore;
      const el = document.querySelector('[data-ac-plugin="rebuilder"]') as HTMLElement;
      return {
        version: ac['version'],
        lang: ac['lang'],
        user: ac['user'],
        basePath: ac.page['basePath'],
        methods: ['getAccessToken', 'login', 'setTitle', 'getMount', 'on'].filter((m) => typeof ac[m] === 'function'),
        shadow: !!el.shadowRoot,
      };
    });
    expect(host).toMatchObject({ version: 1, lang: 'fr', user: null, basePath: '/pages/deckbuilder/', shadow: true });
    expect(host.methods).toHaveLength(5);

    // The plugin renders inside its shadow root; none of its styles land in the site's <head>.
    await expect(page.locator('app-rebuilder-embed')).toBeAttached();
    const styles = await page.evaluate(() => ({
      head: [...document.head.querySelectorAll('style')].filter((s) => /_ng(host|content)-/.test(s.textContent ?? '')).length,
      shadow: document.querySelector('[data-ac-plugin="rebuilder"]')!.shadowRoot!.querySelectorAll('style').length,
    }));
    expect(styles.head).toBe(0);
    expect(styles.shadow).toBeGreaterThan(0);

    // Bootstrap (site) does not style the plugin's buttons, the site theme tokens do reach it.
    const probe = await page.evaluate(() => {
      const root = document.querySelector('[data-ac-plugin="rebuilder"]')!.shadowRoot!.querySelector('.ar-embed') as HTMLElement;
      const css = getComputedStyle(root);
      return {
        primary: css.getPropertyValue('--ar-color-primary').trim().toLowerCase(),
        site: getComputedStyle(document.documentElement).getPropertyValue('--ac-color-primary').trim().toLowerCase(),
      };
    });
    expect(probe.primary).toBe(probe.site);
  });

  test('session token endpoint: POST + CSRF only, 401 for guests', async ({ page, request }) => {
    expect((await request.get('/api/v1/session/token')).status()).toBe(405);
    expect((await request.post('/api/v1/session/token')).status()).toBe(403);

    await page.goto('/pages/deckbuilder');
    const csrf = await csrfOf(page);
    const guest = await page.request.post('/api/v1/session/token', { headers: { 'X-CSRF-Token': csrf } });
    expect(guest.status()).toBe(401);
    expect(await page.evaluate(() => (window as unknown as { AlteredCore: { getAccessToken(): Promise<string | null> } }).AlteredCore.getAccessToken())).toBeNull();
  });

  test('a signed-in session yields a Keycloak token the decks API accepts', async ({ page }) => {
    await login(page, 'alice', '/pages/deckbuilder');
    const token = await page.evaluate(() =>
      (window as unknown as { AlteredCore: { getAccessToken(): Promise<string | null> } }).AlteredCore.getAccessToken(),
    );
    expect(token).toBeTruthy();
    const claims = JSON.parse(Buffer.from(token!.split('.')[1], 'base64url').toString('utf8')) as Record<string, unknown>;
    expect(claims['azp']).toBe('main-site');
    expect(claims['sub']).toBe('11111111-1111-1111-1111-111111111111');

    // Same token straight to the decks API, as a plugin does from the browser (Bearer, CORS).
    const mine = await page.evaluate(async ([api, bearer]) => {
      const res = await fetch(`${api}/api/decks?itemsPerPage=1`, { headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } });
      return res.status;
    }, [DECKS_API, token!] as const);
    expect(mine).toBe(200);
  });
});
