#!/usr/bin/env node
// The CLS of every Re:Builder screen at several screen sizes, first and second visit, in one table: to find the shifts a
// change brings or removes across the breakpoints (loading.spec.ts checks two sizes only). Each cell is the largest
// CLS of `--runs` loads; the JSON has the shifts (boxes that moved) and the recorder's issues of every load.
//
//   node tests/e2e/loading-matrix.ts [options]
//     --base <url>        site to load (default E2E_BASE_URL or http://localhost:8080)
//     --screens a,b       screens of plugins/rebuilder/e2e/screens.ts (default: all)
//     --viewports a,b     sizes of VIEWPORTS in loading.ts (default: all)
//     --visits a,b        first, second (default: both)
//     --runs <n>          loads per cell (default 1)
//     --profile <p>       phone (default), slowPhone, fast
//     --out <file>        default test-results/loading/matrix.json
//
// Node ≥ 22.18 (TypeScript type stripping). Run from tests/e2e (its node_modules) against the full stack.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium, type Browser, type BrowserContextOptions } from '@playwright/test';
import { VIEWPORTS, emptyCache, loadingReport, throttle, watchLoading, type LoadingReport, type Profile } from './loading.ts';
import { createServerDeck } from '../../plugins/rebuilder/e2e/decks.ts';
import { FORBIDDEN_TEXTS, SCREENS } from '../../plugins/rebuilder/e2e/screens.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const list = (name: string, all: string[]) => {
  const picked = option(name)?.split(',') ?? all;
  const unknown = picked.filter((p) => !all.includes(p));
  if (unknown.length) throw new Error(`--${name}: unknown ${unknown.join(', ')} (${all.join(', ')})`);
  return picked;
};
const base = option('base', process.env['E2E_BASE_URL'] ?? 'http://localhost:8080')!;
const screens = list('screens', SCREENS.map((s) => s.key)).map((k) => SCREENS.find((s) => s.key === k)!);
const viewports = list('viewports', Object.keys(VIEWPORTS));
const visits = list('visits', ['first', 'second']);
const runs = Number(option('runs', '1'));
const profile = option('profile', 'phone') as Profile;
const out = resolve(option('out', 'test-results/loading/matrix.json')!);
const PASSWORD = 'TestPassword1234'; // docker/stack/players-realm.json

type State = BrowserContextOptions['storageState'];

/** Signs alice in once (the contexts of the loads reuse her cookies) and creates the deck of the deck screens. */
async function signIn(browser: Browser): Promise<{ state: State; deckId: string }> {
  const context = await browser.newContext();
  await context.addCookies([{ name: 'alteredcore_consent', value: '1', url: base }, { name: 'ac_beta', value: '1', url: base }]);
  const page = await context.newPage();
  await page.goto(`${base}/auth/keycloak-login?return=${encodeURIComponent('/pages/decks')}`);
  await page.locator('#username').fill('alice');
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#kc-login').click();
  await page.waitForURL((u) => u.pathname.startsWith('/pages/decks'));
  await page.locator('[data-ac-plugin]').waitFor();
  const deckId = screens.some((s) => s.deck) ? await createServerDeck(page, `E2E matrix ${Date.now()}`) : '';
  const state = await context.storageState();
  await context.close();
  return { state, deckId };
}

/** One load of `url` at `size`, recorded: a first visit (empty cache) or a second one (the page loaded once before). */
async function load(browser: Browser, state: State, size: string, url: string, visit: string): Promise<LoadingReport> {
  const context = await browser.newContext({ ...VIEWPORTS[size], storageState: state, serviceWorkers: 'block' });
  const page = await context.newPage();
  const settle = async () => {
    await page.locator('.ac-spa-placeholder').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
  };
  if (visit === 'second') {
    await page.goto(url);
    await settle();
  } else {
    await page.goto(`${base}/`);
    await emptyCache(page);
  }
  await watchLoading(page, FORBIDDEN_TEXTS);
  await throttle(page, profile);
  await page.goto(url);
  await settle();
  const report = await loadingReport(page);
  await context.close();
  return report;
}

mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch();
const { state, deckId } = await signIn(browser);
const results: { screen: string; viewport: string; visit: string; reports: LoadingReport[] }[] = [];
for (const screen of screens) {
  const path = screen.path(deckId);
  const url = new URL(`${path}${path.includes('?') ? '&' : '?'}lang=fr`, base).href;
  for (const viewport of viewports) {
    for (const visit of visits) {
      const reports: LoadingReport[] = [];
      for (let i = 0; i < runs; i++) reports.push(await load(browser, state, viewport, url, visit));
      results.push({ screen: screen.key, viewport, visit, reports });
      const worst = Math.max(...reports.map((r) => r.cls));
      const issues = [...new Set(reports.flatMap((r) => r.issues.map((x) => x.kind)))];
      console.log(`${screen.key.padEnd(9)} ${viewport.padEnd(9)} ${visit.padEnd(6)} CLS ${worst.toFixed(4)}${issues.length ? `  ${issues.join(', ')}` : ''}`);
      for (const s of reports.flatMap((r) => r.shifts).filter((x) => x.value >= 0.001)) console.log(`    ${s.t} ms ${s.value}: ${s.boxes.slice(0, 3).join('; ')}`);
    }
  }
}
await browser.close();
writeFileSync(out, JSON.stringify({ base, profile, runs, results }, null, 2));

// Table: one row per screen and visit, one column per size; the cells over 0.01 are marked.
const head = ['screen', 'visit', ...viewports];
const rows = screens.flatMap((s) => visits.map((v) => [s.key, v, ...viewports.map((vp) => {
  const cell = results.find((r) => r.screen === s.key && r.viewport === vp && r.visit === v)!;
  const cls = Math.max(...cell.reports.map((r) => r.cls));
  return `${cls > 0.01 ? '*' : ''}${cls.toFixed(3)}${cell.reports.some((r) => r.issues.length) ? '!' : ''}`;
})]));
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
console.log(`\n${[head, ...rows].map((r) => r.map((c, i) => c.padEnd(widths[i])).join('  ')).join('\n')}`);
console.log(`\n* over 0.01  ! issue (empty frame, unstyled, font, text): see ${out}`);
