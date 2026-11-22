#!/usr/bin/env node
// Frame-by-frame loading of a page, for a pull request's evidence or to find what moves: every frame the screen
// changes, the content area shown empty (the site header alone) framed in red, layout shifts marked, and the recorder's report
// (tests/e2e/loading.ts: CLS, empty frame, unstyled frame, skeleton font, forbidden texts).
//
//   node tests/e2e/loading-timeline.ts <screen | /path> [options]
//     <screen>          a Re:Builder screen (plugins/rebuilder/e2e/screens.ts): decks, deck, search, apercu, mon-deck,
//                       main, new; the screens of a deck use a new deck of the account
//     --base <url>      site to load (default E2E_BASE_URL or http://localhost:8080)
//     --compare <url>   a second site (another checkout's stack: before / after), drawn as a second row
//     --viewport <v>    a size of VIEWPORTS in loading.ts: phone-s, phone (default, 390×844), tablet, laptop-s, laptop,
//                       desktop, wide
//     --desktop         --viewport desktop (1440×900)
//     --first-visit     empty cache (default: second visit, the page loaded once before)
//     --profile <p>     phone (default: 150 ms, 1.6 Mbit/s, CPU 4×), slowPhone (300 ms, 750 kbit/s, CPU 6×), fast
//     --user <u>        alice (default), bob, or none (signed out)
//     --out <dir>       default test-results/loading; writes <name>.png and <name>.json
//     --frames          also writes the frames of the image at full size: <name>/<ms>.png
//
// Node ≥ 22.18 (TypeScript type stripping). Run from tests/e2e (its node_modules) against the full stack.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { VIEWPORTS, emptyCache, loadingReport, throttle, watchLoading, type LoadingReport, type Profile } from './loading.ts';
import { createServerDeck } from '../../plugins/rebuilder/e2e/decks.ts';
import { FORBIDDEN_TEXTS, SCREENS } from '../../plugins/rebuilder/e2e/screens.ts';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const target = args[0];
if (!target || target.startsWith('--')) {
  console.error('usage: node tests/e2e/loading-timeline.ts <screen | /path> [--base url] [--compare url] [--viewport v | --desktop] [--first-visit] [--profile phone|slowPhone|fast] [--user alice|bob|none] [--out dir]');
  console.error(`screens: ${SCREENS.map((s) => s.key).join(', ')}`);
  process.exit(1);
}
const screen = SCREENS.find((s) => s.key === target);
if (!screen && !target.startsWith('/')) throw new Error(`unknown screen ${target} (${SCREENS.map((s) => s.key).join(', ')}), or a path starting with /`);
const bases = [option('base', process.env['E2E_BASE_URL'] ?? 'http://localhost:8080')!, option('compare')].filter((b): b is string => !!b);
const size = flag('desktop') ? 'desktop' : option('viewport', 'phone')!;
if (!VIEWPORTS[size]) throw new Error(`unknown viewport ${size} (${Object.keys(VIEWPORTS).join(', ')})`);
const wide = (VIEWPORTS[size].viewport?.width ?? 0) >= 768;
const firstVisit = flag('first-visit');
const profile = option('profile', 'phone') as Profile;
const user = option('user', 'alice')!;
const out = resolve(option('out', 'test-results/loading')!);
const name = `${screen?.key ?? 'page'}-${size}-${firstVisit ? 'first' : 'second'}-visit`;
const PASSWORD = 'TestPassword1234'; // docker/stack/players-realm.json

interface Frame { ms: number; png: Buffer }
interface Run { base: string; url: string; frames: Frame[]; report: LoadingReport }

async function capture(browser: Browser, base: string): Promise<Run> {
  const context = await browser.newContext({ ...VIEWPORTS[size], deviceScaleFactor: Math.min(VIEWPORTS[size].deviceScaleFactor ?? 1, 2), serviceWorkers: 'block' });
  await context.addCookies([{ name: 'alteredcore_consent', value: '1', url: base }, { name: 'ac_beta', value: '1', url: base }]);
  const page = await context.newPage();
  if (user !== 'none') {
    await page.goto(`${base}/auth/keycloak-login?return=${encodeURIComponent('/pages/decks')}`);
    await page.locator('#username').fill(user);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#kc-login').click();
    await page.waitForURL((u) => u.pathname.startsWith('/pages/decks'));
    await page.locator('[data-ac-plugin]').waitFor();
  }
  const id = screen?.deck ? await createServerDeck(page, `E2E timeline ${Date.now()}`) : '';
  const path = screen ? screen.path(id) : target;
  const url = new URL(path, base).href;
  const settle = async () => {
    await page.locator('.ac-spa-placeholder').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
  };
  if (firstVisit) await emptyCache(page);
  else {
    await page.goto(url);
    await settle();
  }
  await watchLoading(page, FORBIDDEN_TEXTS);
  await throttle(page, profile);
  const cdp = await context.newCDPSession(page);
  const shots: { ts: number; data: string }[] = [];
  cdp.on('Page.screencastFrame', (f) => {
    shots.push({ ts: f.metadata.timestamp ?? 0, data: f.data });
    void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await page.goto(url);
  await settle();
  await cdp.send('Page.stopScreencast');
  const timeOrigin = await page.evaluate(() => performance.timeOrigin / 1000);
  const report = await loadingReport(page);
  await context.close();
  const frames = shots.map((s) => ({ ms: Math.round((s.ts - timeOrigin) * 1000), png: Buffer.from(s.data, 'base64') })).filter((f) => f.ms >= 0);
  return { base, url, frames, report };
}

/** One row per run: the frames where the screen changes, empty content framed in red, shifts marked under the frame. */
async function compose(browser: Browser, runs: Run[], file: string): Promise<void> {
  const framesDir = flag('frames') ? file.replace(/\.png$/, '') : null;
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><body style="margin:0;background:#fff"></body>');
  const rows = await page.evaluate(async (input) => {
    const load = (src: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
    const W = 120;
    const out: { label: string; frames: { ms: number; src: string; empty: boolean; shift: number }[] }[] = [];
    for (const run of input.runs) {
      const kept: { ms: number; src: string; empty: boolean; shift: number }[] = [];
      let prev: Uint8ClampedArray | null = null;
      for (const f of run.frames) {
        const img = await load(f.src);
        const h = Math.round((img.height / img.width) * W);
        const c = document.createElement('canvas');
        c.width = W;
        c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, W, h);
        const px = g.getImageData(0, 0, W, h).data;
        // Content area: under the site header (10 % of the height) and above the bottom navigation (5 %).
        let n = 0, sum = 0, sq = 0, diff = 0;
        for (let y = Math.round(h * 0.12); y < Math.round(h * 0.95); y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4, v = (px[i] + px[i + 1] + px[i + 2]) / 3;
            n++; sum += v; sq += v * v;
          }
        }
        for (let i = 0; prev && i < px.length; i += 4) diff += Math.abs(px[i] - prev[i]) + Math.abs(px[i + 1] - prev[i + 1]) + Math.abs(px[i + 2] - prev[i + 2]);
        const empty = Math.sqrt(sq / n - (sum / n) ** 2) < 2;
        const changed = !prev || diff / (px.length * 0.75) > 3; // skeleton pulses and image fades stay under it
        const shift = run.shifts.filter((s) => s.t <= f.ms && !kept.some((k) => k.ms >= s.t)).reduce((a, s) => a + s.value, 0);
        if (changed || (shift >= 0.001 && kept.length)) kept.push({ ms: f.ms, src: f.src, empty, shift: Math.round(shift * 1000) / 1000 });
        prev = px;
      }
      out.push({ label: run.label, frames: kept });
    }
    return out;
  }, { runs: runs.map((r, i) => ({ label: runs.length > 1 ? (i === 0 ? 'A' : 'B') + ` · ${new URL(r.base).host}` : new URL(r.base).host, shifts: r.report.shifts, frames: r.frames.map((f) => ({ ms: f.ms, src: `data:image/png;base64,${f.png.toString('base64')}` })) })) });
  if (framesDir) {
    rmSync(framesDir, { recursive: true, force: true });
    rows.forEach((r, i) => {
      const dir = rows.length > 1 ? join(framesDir, String.fromCharCode(65 + i)) : framesDir;
      mkdirSync(dir, { recursive: true });
      for (const f of r.frames) writeFileSync(join(dir, `${f.ms}.png`), Buffer.from(f.src.split(',')[1], 'base64'));
    });
  }
  const frameWidth = wide ? 360 : 195;
  await page.setContent(`<!doctype html><style>
      body { margin: 0; background: #fff; font: 600 15px system-ui, sans-serif; color: #0c1a32; }
      main { display: inline-flex; flex-direction: column; gap: 24px; padding: 20px; }
      h2 { margin: 0 0 8px; font-size: 18px; }
      .row { display: flex; gap: 10px; }
      figure { margin: 0; width: ${frameWidth}px; }
      figcaption { height: 22px; }
      img { width: 100%; display: block; border: 3px solid transparent; box-sizing: border-box; }
      .empty img { border-color: #d00000; }
      .empty figcaption, .shift { color: #b00020; }
    </style><main>${rows.map((r, i) => `<section><h2>${r.label} · CLS ${runs[i].report.cls}${runs[i].report.issues.length ? ` · ${runs[i].report.issues.map((x) => x.kind).join(', ')}` : ''}</h2><div class="row">${r.frames
      .map((f) => `<figure class="${f.empty ? 'empty' : ''}"><figcaption>${f.ms} ms${f.empty ? ' · vide' : ''}${f.shift ? ` <span class="shift">· décalage ${f.shift}</span>` : ''}</figcaption><img src="${f.src}"></figure>`)
      .join('')}</div></section>`).join('')}</main>`);
  await page.locator('main').screenshot({ path: file });
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const runs: (Run & { label?: string })[] = [];
for (const base of bases) runs.push(await capture(browser, base));
await compose(browser, runs.map((r) => ({ ...r, label: '' })), join(out, `${name}.png`));
writeFileSync(join(out, `${name}.json`), JSON.stringify(runs.map(({ base, url, report }) => ({ base, url, report })), null, 2));
await browser.close();
for (const r of runs) {
  console.log(`${r.url}\n  CLS ${r.report.cls}, placeholder gone at ${r.report.placeholderGoneAt} ms, ${r.frames.length} frames`);
  for (const i of r.report.issues) console.log(`  ${i.kind} at ${i.t} ms: ${i.detail}`);
  for (const s of r.report.shifts.filter((x) => x.value >= 0.001)) console.log(`  shift ${s.value} at ${s.t} ms: ${s.boxes.slice(0, 3).join('; ')}`);
}
console.log(`\n${join(out, `${name}.png`)}\n${join(out, `${name}.json`)}`);
