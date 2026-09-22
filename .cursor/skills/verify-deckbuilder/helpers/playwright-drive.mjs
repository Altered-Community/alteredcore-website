#!/usr/bin/env node
/**
 * Playwright driver for verify-deckbuilder.
 * Feature recipes match .cursor/skills/verify-deckbuilder/features/.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SITE = process.env.VERIFY_SITE_URL || 'http://localhost:18181';
const EVIDENCE = process.env.VERIFY_EVIDENCE_DIR;
const FEATURE = process.env.VERIFY_FEATURE;
const PROFILE = process.env.VERIFY_PROFILE;
const RUN_ID = process.env.VERIFY_RUN_ID || String(Date.now());
const USER = process.env.VERIFY_USER || 'alice';
const PASS = process.env.VERIFY_PASSWORD || 'TestPassword1234';
const HEADED = process.env.VERIFY_HEADED === '1';

if (!EVIDENCE || !FEATURE || !PROFILE) {
  console.error('VERIFY_EVIDENCE_DIR, VERIFY_FEATURE, VERIFY_PROFILE required');
  process.exit(2);
}

fs.mkdirSync(EVIDENCE, { recursive: true });
const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logLines.push(line);
  console.log(line);
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

async function driveCreateDeck(page, { authenticate }) {
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

  const deckName = `verify-create-${RUN_ID}`;
  await page.fill('#db-new-name', deckName);

  const allUniques = page.locator('label.db-new-format').filter({ hasText: /^Standard All Uniques/i });
  if (await allUniques.count()) {
    await allUniques.locator('input[name="db-new-format"]').check();
  } else {
    const standard = page.locator('input[name="db-new-format"][value="standard"]');
    if (await standard.count()) await standard.check();
    else await page.locator('input[name="db-new-format"]').first().check();
  }
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
  log(`builder hero=${builderHero} name=${nameVal} url=${page.url()}`);
  await dismissCookies(page);
  await shot(page, 'after');
  await dumpHtml(page, 'after');
  fs.writeFileSync(
    path.join(EVIDENCE, `${FEATURE}-meta.json`),
    JSON.stringify({ feature: FEATURE, hero: builderHero, deckName, url: page.url(), runId: RUN_ID }, null, 2),
  );
}

async function driveSearchAdd(page) {
  await driveCreateDeck(page, { authenticate: false });
  await page.locator('.db-search-tab[data-pane="search"]').click();
  await page.fill('#db-search', 'Kojo');
  await page.click('#db-apply-btn');
  await page.waitForSelector('#db-grid .db-card-wrap', { timeout: 60000 });
  await shot(page, 'results');
  const plus = page.locator('#db-grid .db-card-wrap .db-card-btn-group .btn-primary-altered').first();
  await plus.click();
  await page.waitForFunction(() => {
    const c = document.getElementById('db-card-count');
    return c && !/^0\b/.test(c.textContent.trim());
  });
  await shot(page, 'after-add');
  await dumpHtml(page, 'after-add');
}

async function driveSave(page) {
  await login(page);
  await driveCreateDeck(page, { authenticate: false });
  await page.click('#db-save-btn');
  await page.waitForFunction(() => {
    const ok = document.getElementById('db-save-ok');
    return ok && getComputedStyle(ok).display !== 'none';
  }, { timeout: 30000 });
  await shot(page, 'saved');
  await dumpHtml(page, 'saved');
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
  'create-deck': (p) => driveCreateDeck(p, { authenticate: false }),
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
  viewport: { width: 1400, height: 900 },
});
const page = context.pages()[0] || await context.newPage();

try {
  log(`drive ${FEATURE} site=${SITE}`);
  await driver(page);
  log('PASS');
} catch (err) {
  log(`FAIL ${err.stack || err}`);
  try { await shot(page, 'failure'); } catch {}
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(EVIDENCE, 'drive.log'), logLines.join('\n') + '\n');
  await context.close();
}
