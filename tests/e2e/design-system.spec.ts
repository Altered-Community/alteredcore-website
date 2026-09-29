import { evidence, expect, test } from './fixtures';

/** The design system as the shell serves it: tokens, themes, density, icons, reference page. */
test.describe('Design system', () => {
  test('reference page: tokens resolve, theme and density switch, no Font Awesome', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/pages/design-system');
    await expect(page.getByRole('heading', { level: 1, name: 'Design system' })).toBeVisible();

    const read = () =>
      page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          density: document.documentElement.getAttribute('data-density'),
          bg: getComputedStyle(document.body).backgroundColor,
          control: css.getPropertyValue('--ac-control-md').trim(),
          font: getComputedStyle(document.body).fontFamily,
        };
      });

    const light = await read();
    expect(light.theme).toBeNull();
    expect(light.density).toMatch(/^(pointer|touch)$/);
    expect(light.bg).toBe('rgb(243, 245, 249)'); // --ac-color-bg-app, light
    expect(light.font).toContain('Figtree');
    await evidence(page, testInfo, 'design-system-light');

    await page.locator('.ds-toolbar [data-theme-toggle]').click();
    const dark = await read();
    expect(dark.theme).toBe('dark');
    expect(dark.bg).toBe('rgb(15, 18, 24)'); // --ac-color-bg-app, dark
    await evidence(page, testInfo, 'design-system-dark');
    await page.locator('.ds-toolbar [data-theme-toggle]').click();

    await page.locator('#ds-density button[data-density="touch"]').click();
    expect((await read()).control).toBe('44px');
    await page.locator('#ds-density button[data-density="pointer"]').click();
    expect((await read()).control).toBe('40px');

    // Icons are inline Lucide SVG; Font Awesome is no longer loaded.
    expect(await page.locator('#ds-icons ~ .ds-icons svg.ac-icon, .ds-icons svg.ac-icon').count()).toBeGreaterThan(10);
    const fa = await page.evaluate(() => [...document.styleSheets].some((s) => (s.href ?? '').includes('font-awesome')));
    expect(fa).toBe(false);
    expect(errors).toEqual([]);
  });

  test('legacy Font Awesome markup is drawn with Lucide', async ({ page }) => {
    await page.goto('/pages/design-system');
    const drawn = await page.evaluate(() => {
      const i = document.createElement('i');
      i.className = 'fa-solid fa-house';
      document.body.appendChild(i);
      const css = getComputedStyle(i);
      return { mask: css.getPropertyValue('mask-image') || css.getPropertyValue('-webkit-mask-image'), width: i.getBoundingClientRect().width };
    });
    expect(drawn.mask).toContain('data:image/svg+xml');
    expect(drawn.width).toBeGreaterThan(0);
  });

  test('the dark theme survives a reload and reaches the shell', async ({ page }) => {
    await page.goto('/pages/index');
    await page.evaluate(() => localStorage.setItem('acTheme', 'dark'));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
    const header = await page.evaluate(() => getComputedStyle(document.querySelector('.site-header')!).backgroundColor);
    expect(header).toBe('rgb(23, 27, 35)'); // --ac-color-surface, dark
  });
});
