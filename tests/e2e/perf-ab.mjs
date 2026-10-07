// Load performance of Re:Builder's pages, two versions of the site side by side (A/B), on an emulated slow network.
//
//   node perf-ab.mjs <label> --deck <public deck id> [--ab A=https://localhost:8444,B=https://localhost:8443]
//        [--runs 5] [--profiles 3g,4g,fast] [--scenarios decks,deck,editor] [--modes cold,warm,stale]
//        [--dist A=<A's plugins/rebuilder/dist/browser>,B=…]   (stale mode only)
//
// Each variant is a full stack (docker-compose.stack.yml); behind an HTTP/2 proxy to match production (Chrome only
// speaks HTTP/2 over TLS: a Caddy container with `tls internal` in front of each web container does it). The runs
// of A and B alternate, so both get the same network and machine weather; the medians and their difference are
// printed, every run is in test-results/perf/<label>.json.
//
// Mobile (390×844, CPU 4×). Profiles: 4g = 150 ms RTT, 1.6 Mbit/s (Lighthouse's mobile); 3g = 300 ms, 750 kbit/s;
// fast = no throttling. Modes: cold = empty cache; warm = second visit; stale = second visit right after a deploy
// (the build files' mtime is reset first, so the browser's heuristic freshness is ~0 without Cache-Control).
// The site's service worker is blocked: its own requests would escape the page's throttling.
//
// Metrics (ms from navigation start): fcp, lcp; drawn = the app replaced the server's skeleton; ready = the page's
// content without any skeleton (editor: deck drawn and editable); visual = the images on screen loaded; tti
// (Lighthouse-like: 5 s without long task after ready), tbt, cls; jsDone = last plugin module loaded; firstApi =
// first data request; jsKB / totalKB transferred; requests.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, utimesSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'test-results', 'perf');
const args = process.argv.slice(2);
const label = args[0];
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const RUNS = Number(opt('runs', 5));
const VARIANTS = opt('ab', 'A=https://localhost:8444,B=https://localhost:8443').split(',').map((v) => { const [name, base] = v.split('='); return { name, base }; });
const MODES = opt('modes', 'cold,warm').split(',');
const PROFILES = {
  // Lighthouse-like "slow 4G" mobile: 150 ms RTT, 1.6 Mbps, CPU 4x.
  '4g': { latency: 150, down: 1.6e6 / 8, up: 750e3 / 8, cpu: 4 },
  // Regular 3G: 300 ms RTT, 750 kbps down, CPU 4x.
  '3g': { latency: 300, down: 750e3 / 8, up: 250e3 / 8, cpu: 4 },
  // Fast desktop (no throttling): regression guard.
  'fast': { latency: 0, down: -1, up: -1, cpu: 1 },
};
const profiles = opt('profiles', '3g,4g').split(',');
const scenariosWanted = opt('scenarios', 'decks,deck,editor').split(',');

const DECK_SOURCE = opt('deck', '');
if (!label || !DECK_SOURCE) throw new Error('usage: node perf-ab.mjs <label> --deck <public deck id> [options]');
const stateFileOf = (base) => join(OUT, `alice-state-${new URL(base).port}.json`);
const editorDeckFile = join(OUT, `editor-deck-${DECK_SOURCE}.json`);
mkdirSync(OUT, { recursive: true });

async function loginAlice(browser, BASE) {
  const stateFile = stateFileOf(BASE);
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block' });
  await ctx.addCookies([{ name: 'alteredcore_consent', value: '1', url: BASE }, { name: 'ac_beta', value: '1', url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/keycloak-login?return=${encodeURIComponent('/pages/index')}`);
  await page.locator('#username').fill('alice');
  await page.locator('#password').fill('TestPassword1234');
  await page.locator('#kc-login').click();
  await page.waitForURL((u) => !u.pathname.includes('/realms/') && !u.pathname.includes('/auth/'));
  // A copy of a 39-card public deck, owned by alice, for the editor.
  if (!existsSync(editorDeckFile)) {
    await page.goto(`${BASE}/pages/decks`);
    const id = await page.evaluate(async (src) => {
      const ac = window.AlteredCore;
      const d = await (await ac.fetch(`${ac.services.decks}/api/decks/${src}`)).json();
      const body = { name: 'Perf editor deck', format: d.format, isPublic: false, isDraft: false,
        deckCards: d.cards.map((c) => ({ cardReference: c.cardReference, quantity: c.quantity })) };
      const r = await ac.fetch(`${ac.services.decks}/api/decks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json(); if (!j.id) throw new Error(r.status + " " + JSON.stringify(j).slice(0, 300));
      return j.id;
    }, DECK_SOURCE);
    writeFileSync(editorDeckFile, JSON.stringify({ id }));
  }
  await ctx.storageState({ path: stateFile });
  await ctx.close();
}

const READY = {
  // Community decks (guest lands there): deck cards drawn, no skeleton.
  decks: `(root) => root.querySelectorAll('ac-deck-card').length > 0 && !root.querySelector('.ac-skeleton')`,
  // Deck page: card illustrations listed, no skeleton.
  deck: `(root) => root.querySelector('app-deck-preview') && root.querySelectorAll('app-deck-preview img').length > 0 && !root.querySelector('.ac-skeleton')`,
  // Editor: search results and the deck drawn.
  editor: `(root) => root.querySelectorAll('ac-card-tile').length > 0 && root.querySelector('app-deck-bar, ac-bottom-nav') && !root.querySelector('.ac-skeleton')`,
};

function scenarios() {
  const editorId = existsSync(editorDeckFile) ? JSON.parse(readFileSync(editorDeckFile, 'utf8')).id : null;
  return [
    { name: 'decks', url: '/pages/decks', auth: false, ready: READY.decks },
    { name: 'deck', url: `/pages/deck?id=${DECK_SOURCE}`, auth: false, ready: READY.deck },
    { name: 'editor', url: `/pages/deckbuilder?id=${editorId}`, auth: true, ready: READY.editor },
  ].filter((s) => scenariosWanted.includes(s.name));
}

const INIT = (ready) => `
(() => {
  const P = window.__perf = { marks: {}, lt: [], lcp: 0, cls: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) P.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  const isReady = ${ready};
  function inView(img) { const r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0; }
  function tick() {
    const ph = document.querySelector('.ac-spa-placeholder');
    if (ph && !P.marks.placeholder) P.marks.placeholder = performance.now();
    if (P.marks.placeholder && !ph && !P.marks.drawn) P.marks.drawn = performance.now();
    const host = document.querySelector('[data-ac-plugin="rebuilder"]');
    const root = host && host.shadowRoot;
    if (root && !P.marks.ready) { try { if (isReady(root)) P.marks.ready = performance.now(); } catch {} }
    if (P.marks.ready && !P.marks.visual) {
      const imgs = [...root.querySelectorAll('img')].filter(inView);
      if (imgs.every((i) => i.complete && i.naturalWidth > 0)) { P.marks.visual = performance.now(); P.visualImgs = imgs.length; }
    }
    if (!P.marks.visual) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();`;

function tti(lt, from, fcp) {
  // Lighthouse-like: start of the first 5 s window after max(fcp, ready) without long tasks.
  let t = Math.max(fcp, from);
  for (const [s, d] of lt.sort((a, b) => a[0] - b[0])) {
    if (s + d <= t) continue;
    if (s - t >= 5000) break;
    t = s + d;
  }
  return t;
}

// 'stale' mode: the build files were just deployed (Last-Modified = now), so without Cache-Control the browser's
// heuristic freshness is ~0 and a repeat visit revalidates every file.
const DIST = Object.fromEntries(opt('dist', '').split(',').filter(Boolean).map((v) => v.split('=')));
function touchDist(base) {
  const dir = DIST[VARIANTS.find((v) => v.base === base).name];
  if (!dir) throw new Error('stale mode: --dist A=<dir>,B=<dir>');
  const now = new Date();
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else utimesSync(p, now, now); } };
  walk(dir);
}

async function measure(browser, BASE, sc, prof, mode) {
  if (mode === 'stale') touchDist(BASE);
  const warm = mode !== 'cold';
  const ctx = await browser.newContext({
    storageState: sc.auth ? stateFileOf(BASE) : undefined,
    // The site's service worker claims the page during the first visit: its own requests escape the page's
    // throttling. Blocked so every request goes through the emulated network.
    ignoreHTTPSErrors: true, serviceWorkers: 'block',
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  });
  await ctx.addCookies([{ name: 'alteredcore_consent', value: '1', url: BASE }, { name: 'ac_beta', value: '1', url: BASE }]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');
  if (warm) {
    // Prime the cache with one unthrottled visit, then measure the repeat visit.
    await page.goto(BASE + sc.url, { waitUntil: 'load' });
    await page.waitForFunction(`(() => { const r = document.querySelector('[data-ac-plugin="rebuilder"]')?.shadowRoot; return r && (${sc.ready})(r); })()`, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.goto('about:blank');
  }
  await page.addInitScript(INIT(sc.ready));
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: prof.latency, downloadThroughput: prof.down, uploadThroughput: prof.up });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });

  const reqs = new Map();
  let t0 = null;
  cdp.on('Network.requestWillBeSent', (e) => {
    if (t0 === null && e.type === 'Document') t0 = e.timestamp;
    reqs.set(e.requestId, { url: e.request.url, type: e.type, start: e.timestamp, method: e.request.method });
  });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.fromCache = e.response.fromDiskCache || e.response.fromServiceWorker || e.response.fromPrefetchCache; r.type = e.type; } });
  cdp.on('Network.requestServedFromCache', (e) => { const r = reqs.get(e.requestId); if (r) r.fromCache = true; });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.bytes = e.encodedDataLength; } });

  await page.goto(BASE + sc.url, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction('window.__perf && window.__perf.marks.visual', null, { timeout: 120000, polling: 250 });
  await page.waitForTimeout(warm ? 3000 : 5000); // trailing long tasks for TTI / TBT
  const P = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { ...window.__perf, ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, fcp: fcp ? fcp.startTime : null };
  });
  // Navigation-timing origin vs CDP timestamps: the document request start ~ performance time 0.
  const rel = (ts) => Math.round((ts - t0) * 1000);
  const list = [...reqs.values()].filter((r) => r.end);
  const sum = (f) => list.filter(f).reduce((a, r) => a + (r.bytes || 0), 0);
  const isOurJs = (r) => /\/plugins\/rebuilder\/.*\.js/.test(r.url);
  const jsEnd = Math.max(0, ...list.filter(isOurJs).map((r) => rel(r.end)));
  const firstApi = Math.min(...list.filter((r) => /\/api\/v1\/services\/|cards\.alteredcore|search\.altered\.re|\/papi\//.test(r.url)).map((r) => rel(r.start)));
  const tbt = P.lt.filter(([s]) => s >= (P.fcp ?? 0) && s <= tti(P.lt, P.marks.ready, P.fcp ?? 0)).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
  const res = {
    ttfb: Math.round(P.ttfb), fcp: Math.round(P.fcp), lcp: Math.round(P.lcp), drawn: Math.round(P.marks.drawn), ready: Math.round(P.marks.ready),
    visual: Math.round(P.marks.visual), tti: Math.round(tti(P.lt, P.marks.ready, P.fcp ?? 0)), tbt: Math.round(tbt), cls: +P.cls.toFixed(3),
    jsDone: jsEnd, firstApi: Number.isFinite(firstApi) ? firstApi : null,
    jsKB: +(sum((r) => isOurJs(r)) / 1024).toFixed(1), cssKB: +(sum((r) => r.type === 'Stylesheet') / 1024).toFixed(1),
    imgKB: +(sum((r) => r.type === 'Image') / 1024).toFixed(1), totalKB: +(sum(() => true) / 1024).toFixed(1),
    requests: list.length, jsReqs: list.filter(isOurJs).length, cachedReqs: list.filter((r) => r.fromCache || r.status === 304).length,
    revalidations: list.filter((r) => r.status === 304).length,
    waterfall: list.filter((r) => isOurJs(r) || r.type === 'Stylesheet' || r.type === 'Fetch' || r.type === 'XHR' || r.type === 'Document')
      .map((r) => [rel(r.start), rel(r.end), r.status, r.bytes, r.url.replace(BASE, '').slice(0, 90)]).sort((a, b) => a[0] - b[0]),
  };
  await ctx.close();
  return res;
}

const median = (xs) => { const s = xs.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };

const browser = await chromium.launch();
for (const v of VARIANTS) if (scenariosWanted.includes('editor') && (!existsSync(stateFileOf(v.base)) || args.includes('--relogin'))) await loginAlice(browser, v.base);
const out = { label, date: new Date().toISOString(), runs: RUNS, variants: VARIANTS, results: {} };
const KEYS = ['ttfb', 'fcp', 'lcp', 'drawn', 'ready', 'visual', 'tti', 'tbt', 'cls', 'jsDone', 'firstApi', 'jsKB', 'cssKB', 'imgKB', 'totalKB', 'requests', 'jsReqs', 'revalidations'];
const SHOW = ['fcp', 'lcp', 'drawn', 'ready', 'visual', 'tti', 'tbt', 'cls', 'jsDone', 'firstApi', 'jsKB', 'totalKB', 'requests'];
for (const pname of profiles) {
  for (const sc of scenarios()) {
    for (const mode of MODES) {
      const key = `${sc.name}/${pname}/${mode}`;
      const runs = Object.fromEntries(VARIANTS.map((v) => [v.name, []]));
      for (let i = 0; i < RUNS; i++) {
        // Alternate which variant goes first.
        const order = i % 2 ? [...VARIANTS].reverse() : VARIANTS;
        for (const v of order) {
          try { runs[v.name].push(await measure(browser, v.base, sc, PROFILES[pname], mode)); }
          catch (e) { console.error(key, v.name, 'run failed', e.message.split('\n')[0]); }
        }
      }
      out.results[key] = {};
      for (const v of VARIANTS) {
        const med = Object.fromEntries(KEYS.map((k) => [k, median(runs[v.name].map((r) => r[k]))]));
        out.results[key][v.name] = { median: med, runs: runs[v.name] };
        console.log(`${key.padEnd(18)} ${v.name}`, SHOW.map((k) => `${k}=${med[k]}`).join(' '));
      }
      if (VARIANTS.length === 2) {
        const [a, b] = VARIANTS.map((v) => out.results[key][v.name].median);
        console.log(`${key.padEnd(18)} Δ`, SHOW.map((k) => `${k}=${a[k] != null && b[k] != null ? (b[k] - a[k] > 0 ? '+' : '') + +(b[k] - a[k]).toFixed(3) : '?'}`).join(' '));
      }
      writeFileSync(join(OUT, `${label}.json`), JSON.stringify(out, null, 1));
    }
  }
}
await browser.close();
