#!/usr/bin/env node
/**
 * Playwright driver for verify-deckbuilder.
 * Feature recipes match .cursor/skills/verify-deckbuilder/features/.
 * Default proven path: frontier-save.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SITE = process.env.VERIFY_SITE_URL || 'http://localhost:18181';
const EVIDENCE = process.env.VERIFY_EVIDENCE_DIR;
const FEATURE = process.env.VERIFY_FEATURE || 'frontier-save';
const PROFILE = process.env.VERIFY_PROFILE;
const RUN_ID = process.env.VERIFY_RUN_ID || String(Date.now());
const USER = process.env.VERIFY_USER || 'alice';
const PASS = process.env.VERIFY_PASSWORD || 'TestPassword1234';
const HEADED = process.env.VERIFY_HEADED === '1';
const SLOWMO = Number(process.env.VERIFY_SLOWMO || (HEADED ? '250' : '0')) || 0;

if (!EVIDENCE || !PROFILE) {
  console.error('VERIFY_EVIDENCE_DIR, VERIFY_PROFILE required');
  process.exit(2);
}

fs.mkdirSync(EVIDENCE, { recursive: true });
const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${FEATURE} ${msg}`;
  logLines.push(line);
  console.log(line);
}

function writeLogs() {
  const body = logLines.join('\n') + '\n';
  fs.writeFileSync(path.join(EVIDENCE, 'drive.log'), body);
  fs.writeFileSync(path.join(EVIDENCE, `${FEATURE}-drive.log`), body);
}

async function dismissCookies(page) {
  const selectors = '.cky-btn-accept, [data-cky-tag="accept-button"], button:has-text("Accept")';
  const tryClick = async (root, label) => {
    const btn = root.locator(selectors).first();
    try {
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ timeout: 5000 });
        log(`dismissed cookie banner (${label})`);
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };
  if (await tryClick(page, 'page')) return;
  try {
    const iframeBtn = page.frameLocator('iframe[src*="cookieyes"], iframe[title*="Cookie"]').locator(selectors).first();
    if (await iframeBtn.isVisible({ timeout: 2000 })) {
      await iframeBtn.click({ timeout: 5000 });
      log('dismissed cookie banner (iframe)');
      await page.waitForTimeout(500);
      return;
    }
  } catch { /* no iframe */ }
  for (const frame of page.frames()) {
    if (await tryClick(frame, frame.url())) return;
  }
}

async function shot(page, name) {
  const file = path.join(EVIDENCE, `${FEATURE}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  log(`screenshot ${file}`);
}

async function dumpHtml(page, name) {
  const file = path.join(EVIDENCE, `${FEATURE}-${name}.html`);
  fs.writeFileSync(file, await page.content());
  log(`html ${file}`);
}

async function login(page) {
  log('login via Keycloak');
  await page.goto(`${SITE}/pages/login`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.click('a[href*="keycloak-login"]');
  await page.waitForSelector('#username', { timeout: 30000 });
  await page.fill('#username', USER);
  await page.fill('#password', PASS);
  await Promise.all([
    page.waitForURL((url) => url.host.includes('localhost:18181'), { timeout: 45000 }),
    page.click('button[type="submit"], input[type="submit"], #kc-login'),
  ]);
  log(`logged in as ${USER}, url=${page.url()}`);
}

async function pickFormat(page, format) {
  if (format === 'frontier') {
    const byVal = page.locator('input[name="db-new-format"][value="frontier"]');
    if (await byVal.count()) {
      await byVal.check();
      log('format=frontier (value)');
      return;
    }
    const byName = page.locator('label.db-new-format').filter({
      has: page.locator('.db-new-format-name', { hasText: /^Frontier$/i }),
    });
    if (await byName.count()) {
      await byName.locator('input[name="db-new-format"]').check();
      log('format=frontier (label Frontier)');
      return;
    }
    throw new Error('Frontier format radio not found (value=frontier / name Frontier)');
  }

  const allUniques = page.locator('label.db-new-format').filter({ hasText: /^Standard All Uniques/i });
  if (await allUniques.count()) {
    await allUniques.locator('input[name="db-new-format"]').check();
    log('format=Standard All Uniques');
    return;
  }
  const standard = page.locator('input[name="db-new-format"][value="standard"]');
  if (await standard.count()) {
    await standard.check();
    log('format=standard (value fallback)');
    return;
  }
  await page.locator('input[name="db-new-format"]').first().check();
  log('format=first radio fallback');
}

async function driveCreateDeck(page, { authenticate, format = 'standard-all-uniques', namePrefix = 'verify-create' }) {
  if (authenticate) await login(page);

  await page.goto(`${SITE}/pages/deckbuilder`, { waitUntil: 'domcontentloaded' });
  await page.addLocatorHandler(page.locator('.cky-btn-accept, [data-cky-tag="accept-button"]'), async (el) => {
    await el.click();
    log('dismissed cookie banner (handler)');
  });
  await dismissCookies(page);
  await page.waitForSelector('#db-new-modal', { timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.getElementById('db-new-modal');
    return el && getComputedStyle(el).display !== 'none';
  });
  await shot(page, 'before');

  await page.click('#db-new-hero');
  await page.waitForSelector('#db-hero-modal', { state: 'visible' });
  const ax = page.locator('.db-faction-btn[data-faction="AX"]');
  if (await ax.count()) await ax.click();
  await page.waitForSelector('#db-hero-grid .db-hero-tile', { timeout: 60000 });
  await page.locator('#db-hero-grid .db-hero-tile').first().click();
  await page.click('#db-hero-confirm');
  await page.waitForFunction(() => {
    const n = document.getElementById('db-new-hero-name');
    return n && n.textContent && !/Select a hero|Choisir/i.test(n.textContent) && n.textContent.trim() !== '';
  });
  const heroName = (await page.locator('#db-new-hero-name').textContent()).trim();
  log(`hero=${heroName}`);

  const deckName = `${namePrefix}-${RUN_ID}`;
  await page.fill('#db-new-name', deckName);

  await pickFormat(page, format);
  await shot(page, 'wizard');

  await page.click('#db-new-submit');
  await dismissCookies(page);
  await page.waitForFunction(() => {
    const modal = document.getElementById('db-new-modal');
    const banner = document.getElementById('db-hero-banner');
    const name = document.getElementById('db-deck-name');
    const modalGone = modal && getComputedStyle(modal).display === 'none';
    const heroOk = banner && banner.innerText.trim() && !/Select a hero/i.test(banner.innerText);
    const nameOk = name && name.value.trim();
    return modalGone && heroOk && nameOk;
  }, { timeout: 45000 });

  const builderHero = await page.evaluate(() => (document.getElementById('db-hero-banner')?.innerText || '').trim().split('\n')[0]);
  const nameVal = await page.evaluate(() => document.getElementById('db-deck-name')?.value || '');
  if (!builderHero || /Select a hero/i.test(builderHero)) {
    throw new Error(`hero not applied in builder: ${builderHero}`);
  }
  if (nameVal !== deckName) {
    throw new Error(`deck name mismatch: ${nameVal} != ${deckName}`);
  }
  log(`builder hero=${builderHero} name=${nameVal} url=${page.url()} format=${format}`);
  await dismissCookies(page);
  await shot(page, 'after-create');
  await shot(page, 'after');
  return { deckName, builderHero };
}

async function addCopies(page, want = 3) {
  const searchTab = page.locator('.db-search-tab[data-pane="search"]');
  if (await searchTab.count()) await searchTab.click();
  await page.waitForSelector('#db-grid .db-card-wrap', { timeout: 60000 });
  await shot(page, 'results');

  const plus = page.locator('#db-grid .db-card-wrap').filter({
    has: page.locator('.db-card-btn-group .btn-primary-altered'),
    hasNot: page.locator('.db-card-add-overlay'),
  }).locator('.db-card-btn-group .btn-primary-altered');

  const available = await plus.count();
  if (available < 1) {
    throw new Error('no add (+) controls on non-hero cards in #db-grid');
  }
  const target = Math.max(1, want);
  let clicks = 0;
  if (available >= target) {
    for (let i = 0; i < target; i++) {
      await plus.nth(i).click();
      clicks += 1;
    }
  } else {
    for (let i = 0; i < available; i++) {
      await plus.nth(i).click();
      clicks += 1;
    }
    while (clicks < target) {
      await plus.first().click();
      clicks += 1;
    }
  }
  log(`add-copy clicks=${clicks} availablePlus=${available} want=${target}`);
  await page.waitForFunction((min) => {
    const items = document.querySelectorAll('#db-card-list .deck-list-item').length;
    const c = document.getElementById('db-card-count');
    const countOk = c && !/^0\b/.test(c.textContent.trim());
    return items >= min && countOk;
  }, Math.min(target, clicks), { timeout: 30000 });
  const added = await page.evaluate(() => ({
    items: document.querySelectorAll('#db-card-list .deck-list-item').length,
    count: (document.getElementById('db-card-count')?.textContent || '').trim(),
  }));
  log(`sidebar items=${added.items} count=${added.count}`);
  if (added.items < Math.min(target, 2) && target >= 2) {
    throw new Error(`expected ≥2 sidebar cards, got ${added.items}`);
  }
  if (target === 1 && added.items < 1) {
    throw new Error(`expected ≥1 sidebar card, got ${added.items}`);
  }
  await shot(page, 'after-add');
  await dumpHtml(page, 'after-add');
  return added;
}

async function saveDeck(page) {
  await dismissCookies(page);
  await page.click('#db-save-btn');
  await page.waitForFunction(() => {
    const err = document.getElementById('db-save-error');
    if (err && getComputedStyle(err).display !== 'none') return 'error';
    const ok = document.getElementById('db-save-ok');
    return ok && getComputedStyle(ok).display !== 'none' ? 'ok' : false;
  }, { timeout: 30000 });
  const saveText = await page.evaluate(() => (document.getElementById('db-save-ok')?.innerText || '').trim());
  const errText = await page.evaluate(() => {
    const err = document.getElementById('db-save-error');
    if (!err || getComputedStyle(err).display === 'none') return '';
    return (document.getElementById('db-save-error-msg')?.innerText || err.innerText || '').trim();
  });
  if (errText) throw new Error(`save error: ${errText}`);
  if (!/Deck saved/i.test(saveText)) {
    throw new Error(`save banner unexpected: ${saveText}`);
  }
  log(`save-ok=${saveText} url=${page.url()}`);
  await shot(page, 'saved');
  await dumpHtml(page, 'saved');
  return saveText;
}

async function verifyOnList(page, deckName) {
  await page.goto(`${SITE}/pages/decks`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.waitForSelector('#my-deck-search, #my-deck-grid, #guest-deck-grid', { timeout: 30000 });
  const search = page.locator('#my-deck-search');
  if (!(await search.count())) {
    throw new Error('My decks search missing — not logged in? #my-deck-search not in DOM');
  }
  await search.fill(deckName);
  await page.waitForFunction((name) => {
    const items = [...document.querySelectorAll('#my-deck-grid .my-deck-item')];
    return items.some((el) => {
      const title = el.querySelector('.news-card-title')?.innerText || '';
      const aria = el.querySelector('.deck-card-link-overlay')?.getAttribute('aria-label') || '';
      return title.includes(name) || aria.includes(name);
    });
  }, deckName, { timeout: 45000 });
  const hit = await page.evaluate((name) => {
    const items = [...document.querySelectorAll('#my-deck-grid .my-deck-item')];
    const el = items.find((node) => {
      const title = node.querySelector('.news-card-title')?.innerText || '';
      const aria = node.querySelector('.deck-card-link-overlay')?.getAttribute('aria-label') || '';
      return title.includes(name) || aria.includes(name);
    });
    if (!el) return null;
    return {
      title: (el.querySelector('.news-card-title')?.innerText || '').trim(),
      format: el.getAttribute('data-format') || '',
      id: el.getAttribute('data-deck-id') || '',
    };
  }, deckName);
  if (!hit) throw new Error(`deck not found in #my-deck-grid: ${deckName}`);
  log(`list-hit title=${hit.title} format=${hit.format} id=${hit.id}`);
  await shot(page, 'list');
  await dumpHtml(page, 'list');
  return hit;
}

async function driveFrontierSave(page) {
  await login(page);
  const { deckName, builderHero } = await driveCreateDeck(page, {
    authenticate: false,
    format: 'frontier',
    namePrefix: 'verify-frontier',
  });
  const added = await addCopies(page, 3);
  const saveText = await saveDeck(page);
  if (/locally/i.test(saveText)) {
    throw new Error('expected server save (Deck saved!), got guest local save');
  }
  const hit = await verifyOnList(page, deckName);
  fs.writeFileSync(
    path.join(EVIDENCE, `${FEATURE}-meta.json`),
    JSON.stringify({
      feature: FEATURE,
      hero: builderHero,
      deckName,
      format: 'frontier',
      cardsAdded: added.items,
      cardCount: added.count,
      saveText,
      listHit: hit,
      url: page.url(),
      runId: RUN_ID,
      user: USER,
    }, null, 2),
  );
}

async function driveSearchAdd(page) {
  await driveCreateDeck(page, { authenticate: false });
  await addCopies(page, 1);
}

async function driveSave(page) {
  await login(page);
  await driveCreateDeck(page, { authenticate: false });
  await saveDeck(page);
}

async function driveBrowse(page) {
  await page.goto(`${SITE}/pages/decks`, { waitUntil: 'domcontentloaded' });
  await shot(page, 'list');
  await page.click('a[href$="/pages/deckbuilder"]');
  await page.waitForSelector('#db-new-modal, #db-tab-search', { timeout: 30000 });
  await shot(page, 'after-new');
  await dumpHtml(page, 'after-new');
}

async function driveStats(page) {
  await driveCreateDeck(page, { authenticate: false });
  await page.locator('.db-search-tab[data-pane="view"]').click();
  await page.waitForFunction(() => {
    const el = document.getElementById('db-search-pane-view');
    return el && getComputedStyle(el).display !== 'none';
  });
  await shot(page, 'view-deck');
  await page.locator('.db-deck-tab[data-pane="stats"]').click();
  await page.waitForFunction(() => {
    const el = document.getElementById('db-deck-pane-stats');
    return el && getComputedStyle(el).display !== 'none';
  });
  await shot(page, 'stats');
  await dumpHtml(page, 'stats');
}

const drivers = {
  'frontier-save': driveFrontierSave,
  'create-deck': (p) => driveCreateDeck(p, { authenticate: false }).then(async (r) => {
    await dumpHtml(p, 'after');
    fs.writeFileSync(
      path.join(EVIDENCE, `${FEATURE}-meta.json`),
      JSON.stringify({ feature: FEATURE, hero: r.builderHero, deckName: r.deckName, url: p.url(), runId: RUN_ID }, null, 2),
    );
  }),
  'search-add-cards': driveSearchAdd,
  'save-deck': driveSave,
  'browse-decks': driveBrowse,
  'view-stats-hand': driveStats,
};

const driver = drivers[FEATURE];
if (!driver) {
  console.error(`unknown feature ${FEATURE}`);
  process.exit(2);
}

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: !HEADED,
  slowMo: SLOWMO,
  viewport: { width: 1400, height: 900 },
});
const page = context.pages()[0] || await context.newPage();

try {
  log(`drive ${FEATURE} site=${SITE} headed=${HEADED} slowMo=${SLOWMO}`);
  await driver(page);
  log('PASS');
} catch (err) {
  log(`FAIL ${err.stack || err}`);
  try { await shot(page, 'failure'); } catch {}
  process.exitCode = 1;
} finally {
  writeLogs();
  await context.close();
}
