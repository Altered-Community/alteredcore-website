import { csrfOf, expect, login, test } from './fixtures';

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
        methods: ['login', 'setTitle', 'getMount', 'on'].filter((m) => typeof ac[m] === 'function'),
        shadow: !!el.shadowRoot,
      };
    });
    expect(host).toMatchObject({ version: 1, lang: 'fr', user: null, basePath: '/pages/deckbuilder/', shadow: true });
    expect(host.methods).toHaveLength(4);
    // No token API: authenticated services are reached through the site's relay.
    expect(await page.evaluate(() => 'getAccessToken' in (window as unknown as { AlteredCore: object }).AlteredCore)).toBe(false);
    expect(await page.evaluate(() => (window as unknown as { AlteredCore: { services: Record<string, string> } }).AlteredCore.services['decks'])).toBe('/api/v1/services/decks');

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

  test('service relay: listed services, api/ paths, CSRF on writes', async ({ page, request }) => {
    expect((await request.get('/api/v1/services/nope/api/decks')).status()).toBe(404);
    expect((await request.get('/api/v1/services/decks/admin/login')).status()).toBe(400);
    expect((await request.get('/api/v1/services/decks/api/../admin')).status()).toBe(400);
    // Guests are relayed without a token: public reads answer, private ones are refused upstream.
    expect((await request.get('/api/v1/services/decks/api/decks/public?itemsPerPage=1')).status()).toBe(200);
    expect((await request.get('/api/v1/services/decks/api/decks?itemsPerPage=1')).status()).toBe(401);
    expect((await request.post('/api/v1/services/decks/api/decks', { data: {} })).status()).toBe(403);
    expect((await request.get('/api/v1/session/token')).status()).toBe(404);

    await page.goto('/pages/deckbuilder');
    const csrf = await csrfOf(page);
    const guestWrite = await page.request.post('/api/v1/services/decks/api/decks', { headers: { 'X-CSRF-Token': csrf }, data: {} });
    expect(guestWrite.status()).toBe(401);
  });

  test('a signed-in session reaches the decks API through the relay, without a token in the browser', async ({ page }) => {
    await login(page, 'alice', '/pages/deckbuilder');
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/v1/services/decks/api/decks?itemsPerPage=1', { headers: { Accept: 'application/json' } });
      return { status: r.status, body: await r.text() };
    });
    expect(res.status).toBe(200);
    const html = await page.content();
    expect(html).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./); // no JWT in the page or its config
    expect(res.body).not.toContain('access_token');
  });
});
