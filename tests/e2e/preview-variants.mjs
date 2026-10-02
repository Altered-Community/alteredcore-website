#!/usr/bin/env node
// Design variants in the real app, before a rule is written in the design system:
//   node tests/e2e/preview-variants.mjs <scenario.mjs> [--out <dir>] [--only scene,scene]
// The scenario module (see variants/*.mjs) gives the scenes (URL + steps up to the state to show) and the
// variants (CSS added to the page and to every shadow root, so plugin styles can be overridden). For each scene
// and each viewport it writes <out>/<scenario>/<viewport>-<scene>.png: the variants side by side, under their
// labels. The stack must be up (README § Full stack); E2E_BASE_URL as for the e2e tests.
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const USERS = { alice: 'alice', bob: 'bob' };
const PASSWORD = 'TestPassword1234';
const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:8080';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const out = resolve(option('--out') ?? 'evidence/variants');
const only = option('--only')?.split(',');
const file = args[0];
if (!file) {
  console.error('usage: node tests/e2e/preview-variants.mjs <scenario.mjs> [--out <dir>] [--only scene,scene]');
  process.exit(1);
}
const scenario = (await import(pathToFileURL(resolve(file)).href)).default;
const name = basename(file).replace(/\.m?js$/, '');
const dir = join(out, name);
mkdirSync(dir, { recursive: true });

/** Adds `css` to the document and to every open shadow root (replacing the previous variant). */
async function applyVariant(page, css) {
  await page.evaluate((css) => {
    const roots = [document.head, ...[...document.querySelectorAll('*')].map((el) => el.shadowRoot).filter(Boolean)];
    for (const root of roots) {
      // Not `:scope >`: it matches nothing in a shadow root, and the previous variant would stay.
      root.querySelectorAll('style[data-preview-variant]').forEach((style) => style.remove());
      const style = document.createElement('style');
      style.dataset.previewVariant = '';
      style.textContent = css;
      root.appendChild(style);
    }
  }, css);
  // Lets transitions settle and drops a hover left by the last tap or click.
  await page.mouse.move(0, 0).catch(() => undefined);
  await page.waitForTimeout(200);
}

async function login(page, user) {
  await page.goto(`/auth/keycloak-login?return=${encodeURIComponent('/pages/index')}`);
  await page.locator('#username').fill(USERS[user]);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => !url.pathname.includes('/realms/') && !url.pathname.includes('/auth/'));
}

const dataUrl = (path) => `data:image/png;base64,${readFileSync(path).toString('base64')}`;
const variants = Object.entries(scenario.variants);
const browser = await chromium.launch();
for (const viewportName of scenario.viewports ?? ['desktop', 'mobile']) {
  const context = await browser.newContext({ ...VIEWPORTS[viewportName], baseURL: BASE_URL });
  const cookies = [{ name: 'alteredcore_consent', value: '1', url: BASE_URL }];
  if (scenario.beta) cookies.push({ name: 'ac_beta', value: '1', url: BASE_URL });
  await context.addCookies(cookies);
  const page = await context.newPage();
  if (scenario.user) await login(page, scenario.user);
  for (const scene of scenario.scenes.filter((s) => !only || only.includes(s.name))) {
    await page.goto(scene.url);
    await scene.run?.(page, { compact: viewportName === 'mobile' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const shots = [];
    for (const [variant, css] of variants) {
      await applyVariant(page, css);
      const path = join(dir, `.${viewportName}-${scene.name}-${variant}.png`);
      await page.screenshot({ path });
      shots.push({ label: variant, path });
    }
    await applyVariant(page, '');
    // Board: the variants side by side, at the viewport's CSS size.
    const { width, height } = VIEWPORTS[viewportName].viewport;
    const board = await browser.newPage({ deviceScaleFactor: VIEWPORTS[viewportName].deviceScaleFactor });
    await board.setContent(`<!doctype html>
      <style>
        body { margin: 0; background: #fff; font: 700 20px system-ui, sans-serif; color: #0c1a32; }
        main { display: inline-flex; gap: 24px; padding: 16px 24px 24px; }
        figure { margin: 0; display: flex; flex-direction: column; gap: 8px; }
        img { width: ${width}px; height: ${height}px; display: block; box-shadow: 0 0 0 1px #c9d6ea; }
      </style>
      <main>${shots.map((s) => `<figure><figcaption>${s.label}</figcaption><img src="${dataUrl(s.path)}"></figure>`).join('')}</main>`);
    const target = join(dir, `${viewportName}-${scene.name}.png`);
    await board.locator('main').screenshot({ path: target });
    await board.close();
    for (const s of shots) rmSync(s.path);
    console.log(target);
  }
  await context.close();
}
await browser.close();
