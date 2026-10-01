import { BETA_COOKIE, csrfOf, expect, login, setBeta, test } from './fixtures';

/**
 * The shell's side of manifest v2: routing, host contract, session token. The SPA page under test is Re:Builder's,
 * served on the site's decks pages with « Beta Deckbuilder » on.
 */
test.describe('Shell · SPA pages', () => {
  test.beforeEach(async ({ page }) => setBeta(page, true));

  test('deep paths reach SPA pages only; PHP pages keep a single URL', async ({ request }) => {
    // The plugin's own page answers deep paths (its former links, redirected to the site's URLs by its meta.php).
    for (const [path, to] of [['/pages/rebuilder', '/pages/decks'], ['/pages/rebuilder/decks/new', '/pages/deckbuilder'], ['/pages/rebuilder/any/deep/path', '/pages/decks']]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(302);
      expect(new URL(res.headers()['location']!, 'http://x').pathname, path).toBe(to);
    }
    expect((await request.get('/pages/decks/anything')).status()).toBe(404);
    expect((await request.get('/pages/news/anything')).status()).toBe(404);
    // Without the beta, the site's own decks pages and deck builder.
    for (const path of ['/pages/decks', '/pages/deckbuilder']) {
      const res = await request.get(path, { headers: { Cookie: '' } });
      expect(res.status(), path).toBe(200);
      expect(await res.text(), path).not.toContain('data-ac-plugin="rebuilder"');
    }
  });

  test('« Beta Deckbuilder »: the SPA page serves its beta_slugs at their URLs, the site page keeps its calls', async ({ playwright, baseURL }) => {
    const beta = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Cookie: `${BETA_COOKIE}=1` } });
    for (const path of ['/pages/decks', '/pages/deck?id=00000000-0000-0000-0000-000000000000', '/pages/deckbuilder']) {
      const res = await beta.get(path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect(html, path).toContain('data-ac-plugin="rebuilder"');
      expect(html, path).toContain('"basePath":"/pages/"');
    }
    // ?ajax=… calls of the site's pages still reach them (JSON), deep paths stay PHP-only.
    const heroes = await beta.get('/pages/decks?ajax=heroes');
    expect(heroes.headers()['content-type']).toContain('application/json');
    expect((await beta.get('/pages/decks/anything')).status()).toBe(404);
    await beta.dispose();
  });

  test('publishes window.AlteredCore v1 and isolates the plugin in a shadow root', async ({ page }) => {
    await page.goto('/pages/decks?lang=fr');
    // The plugin asks for its mount (and the shell attaches the shadow root) once its modules load.
    await expect(page.locator('app-rebuilder-embed')).toBeAttached();
    const host = await page.evaluate(() => {
      const ac = (window as unknown as { AlteredCore: Record<string, unknown> & { page: Record<string, string> } }).AlteredCore;
      const el = document.querySelector('[data-ac-plugin="rebuilder"]') as HTMLElement;
      return {
        version: ac['version'],
        lang: ac['lang'],
        user: ac['user'],
        basePath: ac.page['basePath'],
        methods: ['fetch', 'login', 'setTitle', 'getMount', 'on'].filter((m) => typeof ac[m] === 'function'),
        shadow: !!el.shadowRoot,
      };
    });
    expect(host).toMatchObject({ version: 1, lang: 'fr', user: null, basePath: '/pages/', shadow: true });
    expect(host.methods).toHaveLength(5);
    // No token API: authenticated services are reached through the site's relay.
    expect(await page.evaluate(() => 'getAccessToken' in (window as unknown as { AlteredCore: object }).AlteredCore)).toBe(false);
    expect(await page.evaluate(() => (window as unknown as { AlteredCore: { services: Record<string, string> } }).AlteredCore.services['decks'])).toBe('/api/v1/services/decks');

    // The plugin renders inside its shadow root; none of its styles land in the site's <head>.
    // Component styles arrive with the first routed screen (the root component has none).
    await expect
      .poll(() => page.evaluate(() => document.querySelector('[data-ac-plugin="rebuilder"]')!.shadowRoot!.querySelectorAll('style').length))
      .toBeGreaterThan(0);
    const styles = await page.evaluate(() => ({
      head: [...document.head.querySelectorAll('style')].filter((s) => /_ng(host|content)-/.test(s.textContent ?? '')).length,
      shadow: document.querySelector('[data-ac-plugin="rebuilder"]')!.shadowRoot!.querySelectorAll('style').length,
    }));
    expect(styles.head).toBe(0);
    expect(styles.shadow).toBeGreaterThan(0);

    // Design system: the shell injects its base and ac-* component CSS into the shadow root,
    // before the plugin's own styles; the --ac-* tokens inherit from <html> (both themes).
    const probe = await page.evaluate(() => {
      const shadow = document.querySelector('[data-ac-plugin="rebuilder"]')!.shadowRoot!;
      const root = shadow.querySelector('.ac-plugin-root') as HTMLElement;
      const links = [...shadow.querySelectorAll('link[rel="stylesheet"]')].map((l) => new URL((l as HTMLLinkElement).href).pathname);
      return {
        primary: getComputedStyle(root).getPropertyValue('--ac-color-primary').trim().toLowerCase(),
        site: getComputedStyle(document.documentElement).getPropertyValue('--ac-color-primary').trim().toLowerCase(),
        firstLink: links[0] ?? '',
        components: links.some((l) => l.startsWith('/design-system/css/components/')),
      };
    });
    expect(probe.primary).toBe(probe.site);
    expect(probe.firstLink).toBe('/design-system/css/base.css');
    expect(probe.components).toBe(true);
  });

  test('service relay: listed services, api/ paths, CSRF on writes', async ({ page, request }) => {
    expect((await request.get('/api/v1/services/nope/api/decks')).status()).toBe(404);
    expect((await request.get('/api/v1/services/decks/admin/login')).status()).toBe(400);
    expect((await request.get('/api/v1/services/decks/api/../admin')).status()).toBe(400);
    // Encoded traversal never reaches the service: refused by the relay (400) or by Apache (%2F: 404).
    for (const [encoded, status] of [['api/%2e%2e/admin', 400], ['api/%252e%252e/admin', 400], ['api/', 400], ['api/decks%2F..%2Fadmin', 404]] as const) {
      expect((await request.get(`/api/v1/services/decks/${encoded}`)).status(), encoded).toBe(status);
    }
    // Guests are relayed without a token: public reads answer, private ones are refused upstream.
    expect((await request.get('/api/v1/services/decks/api/decks/public?itemsPerPage=1')).status()).toBe(200);
    expect((await request.get('/api/v1/services/decks/api/decks?itemsPerPage=1')).status()).toBe(401);
    expect((await request.post('/api/v1/services/decks/api/decks', { data: {} })).status()).toBe(403);
    expect((await request.get('/api/v1/session/token')).status()).toBe(404);

    await page.goto('/pages/decks');
    const csrf = await csrfOf(page);
    const guestWrite = await page.request.post('/api/v1/services/decks/api/decks', { headers: { 'X-CSRF-Token': csrf }, data: {} });
    expect(guestWrite.status()).toBe(401);
  });

  test('plugin endpoints: the router requires the CSRF token on writes', async ({ page, request }) => {
    const toggle = '/papi/core-altered-cards/favorites-toggle';
    expect((await request.post(toggle, { form: { card_ref: 'x' } })).status()).toBe(403);
    expect((await request.get('/papi/rebuilder/nope')).status()).toBe(404);

    await login(page, 'alice', '/pages/decks');
    const csrf = await csrfOf(page);
    const post = (headers: Record<string, string>, form: Record<string, string>) =>
      page.evaluate(async ([u, h, f]) => {
        const r = await fetch(u, { method: 'POST', headers: h, body: new URLSearchParams(f) });
        return { status: r.status, body: (await r.json()) as Record<string, unknown> };
      }, [toggle, headers, form] as const);
    expect(await post({}, {})).toMatchObject({ status: 403, body: { error: 'csrf' } });
    // Past the router, the endpoint answers itself (no card reference: its own 400).
    expect(await post({}, { csrf_token: csrf })).toMatchObject({ status: 400, body: { code: 'FT03' } });
    expect((await post({ 'X-CSRF-Token': csrf }, {})).body).not.toMatchObject({ error: 'csrf' });
  });

  test('a signed-in session reaches the decks API through the relay, without a token in the browser', async ({ page }) => {
    await login(page, 'alice', '/pages/decks');
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
