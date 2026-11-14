import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);

// Minimal DOM & browser stub to instantiate CardSearch directly in Node.
function makeEl(id, tag = 'div') {
  const classes = new Set();
  const listeners = {};
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    checked: false,
    disabled: false,
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    selectedOptions: [],
    options: [],
    children: [],
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      contains(c) { return classes.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c); else classes.add(c);
        } else if (force) classes.add(c);
        else classes.delete(c);
      },
    },
    attributes: {},
    getAttribute(k) { return this.attributes[k] ?? null; },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, eventObj = {}) {
      for (const fn of listeners[type] || []) fn.call(el, Object.assign({ target: eventObj.target || el, preventDefault() {} }, eventObj));
    },
    closest() { return null; },
    contains() { return true; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
  };
  return el;
}

function setupEnv({ search = '' } = {}) {
  const byId = new Map();
  const toggleButtons = [];
  const tabButtons = [];
  const fetches = [];

  const root = makeEl('cs-panel');
  root.querySelectorAll = (sel) => {
    if (sel.startsWith('.cs-tab[data-tab=')) {
      const m = sel.match(/data-tab="([^"]+)"/);
      return tabButtons.filter((b) => b.dataset.tab === m[1]);
    }
    if (sel === '.cs-tab[data-tab]') return tabButtons;
    if (sel.startsWith('.filter-toggle[data-filter="')) {
      const m = sel.match(/data-filter="([^"]+)"/);
      return toggleButtons.filter((b) => b.dataset.filter === m[1]);
    }
    if (sel === '.filter-toggle[data-bool-filter]') return [];
    if (sel === '.cs-switch[data-bool-filter] input[type="checkbox"]') return [];
    if (sel === '[data-tabs]') return [];
    return [];
  };
  byId.set('cs-panel', root);

  for (const id of ['cs-filter-maincost', 'cs-filter-recallcost', 'cs-filter-forestpower', 'cs-filter-mountainpower', 'cs-filter-oceanpower']) {
    byId.set(id, makeEl(id, 'input'));
  }
  byId.set('cs-filter-cost-relation', makeEl('cs-filter-cost-relation', 'select'));
  byId.set('cs-filter-hasnoeffect', makeEl('cs-filter-hasnoeffect', 'input'));

  for (const tab of ['all', 'unique', 'collection', 'ownership', 'favoris']) {
    const b = makeEl(`tab-${tab}`, 'button');
    b.dataset.tab = tab;
    tabButtons.push(b);
  }
  for (const [f, vals] of [
    ['faction', ['AX', 'BR', 'LY', 'MU', 'OR', 'YZ']],
    ['sets', ['CORE', 'ALIZE', 'COREKS']],
    ['rarity', ['COMMON', 'RARE', 'EXALTED', 'UNIQUE']],
    ['type', ['CHARACTER', 'SPELL']],
    ['format', ['', 'frontier']],
  ]) {
    for (const v of vals) {
      const b = makeEl(`toggle-${f}-${v}`, 'button');
      b.dataset.filter = f;
      b.dataset.value = v;
      if (f === 'format' && v === '') b.classList.add('active');
      toggleButtons.push(b);
    }
  }

  globalThis.location = { pathname: '/pages/cards', search };
  globalThis.history = { pushState() {} };
  globalThis.window = globalThis;
  globalThis.document = {
    getElementById(id) { return byId.get(id) || null; },
    addEventListener() {},
  };
  globalThis.fetch = (url) => {
    fetches.push(url);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ member: [], totalItems: 0, iter: { total: 0 }, cards: [] }),
    });
  };

  return { root, byId, toggleButtons, tabButtons, fetches };
}

const CardSearch = require(path.join(process.cwd(), 'plugins/core-altered-cards/assets/card-search.js'));

let pass = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ok   - ' + msg); } else { console.log('  FAIL - ' + msg); process.exitCode = 1; } }
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  ok(sa === sb, `${msg} (got ${sa}, want ${sb})`);
}

// 1. Open range cap raised to 15 (matching uniques-search-api 0..=15)
{
  setupEnv();
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', uniquesApiBase: 'http://localhost:8005',
    defaults: { factions: [], types: ['CHARACTER'], rarities: ['COMMON'], sets: ['CORE', 'ALIZE'] },
  });
  eq(cs.numUniquesParts('mainCost', '13+, 1'), ['mainCost[]=1', 'mainCost[]=13', 'mainCost[]=14', 'mainCost[]=15'], 'open range extends to 15');
  eq(cs.numUniquesParts('mainCost', '1-3'), ['mainCost[]=1', 'mainCost[]=2', 'mainCost[]=3'], 'contiguous range expands for uniques API');
}

// 2. Tab switch preserves shared filters (costs, search text, faction) while managing tab presets
{
  const env = setupEnv();
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', uniquesApiBase: 'http://localhost:8005',
    uniqueRarity: ['UNIQUE'], uniqueType: ['CHARACTER'], uniqueExtraSets: ['COREKS'],
    defaults: { factions: [], types: ['CHARACTER', 'SPELL'], rarities: ['COMMON', 'RARE'], sets: ['CORE', 'ALIZE'] },
  });
  env.byId.get('cs-filter-maincost').value = '3';
  cs.filters.q = 'kelon';

  const uniqBtn = env.tabButtons.find((b) => b.dataset.tab === 'unique');
  env.root.dispatch('click', { target: { closest: (s) => s === '.cs-tab[data-tab]' ? uniqBtn : null } });

  ok(cs.getTab() === 'unique', 'switched to unique tab');
  ok(cs.filters.mainCost === '3', 'mainCost preserved across tab switch');
  ok(cs.filters.q === 'kelon', 'search query preserved across tab switch');
  ok(cs.filters.sets.includes('COREKS'), 'COREKS added automatically on unique tab');

  const allBtn = env.tabButtons.find((b) => b.dataset.tab === 'all');
  env.root.dispatch('click', { target: { closest: (s) => s === '.cs-tab[data-tab]' ? allBtn : null } });

  ok(cs.getTab() === 'all', 'switched back to all tab');
  ok(cs.filters.mainCost === '3', 'mainCost still preserved returning from unique tab');
  eq(cs.filters.rarity, ['COMMON', 'RARE'], 'default rarities restored cleanly on return');
  ok(!cs.filters.sets.includes('COREKS'), 'auto-added COREKS removed cleanly when leaving unique tab');
}

// 3. Invalid numeric expression marks is-invalid and does NOT fire an unfiltered request
{
  const env = setupEnv();
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', uniquesApiBase: 'http://localhost:8005',
    defaults: { factions: [], types: [], rarities: [], sets: ['CORE'] },
  });
  const inp = env.byId.get('cs-filter-maincost');
  inp.value = 'invalid-expr';
  cs.search(1);
  ok(inp.classList.contains('is-invalid'), 'invalid expression gets is-invalid class');
  ok(env.fetches.length === 0, 'invalid numeric input blocks firing an unfiltered fetch');

  inp.value = '2';
  cs.search(1);
  ok(!inp.classList.contains('is-invalid'), 'valid expression clears is-invalid');
  ok(env.fetches.length === 1 && env.fetches[0].includes('mainCost=2'), 'valid expression triggers filtered fetch');
}

// 4. Collection scope allows multi-select & includes default sets
{
  const env = setupEnv();
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', collApiUrl: '/papi/core-altered-cards/collection-search',
    defaults: { factions: [], types: [], rarities: [], sets: ['CORE', 'ALIZE'] },
  });
  const collBtn = env.tabButtons.find((b) => b.dataset.tab === 'collection');
  env.root.dispatch('click', { target: { closest: (s) => s === '.cs-tab[data-tab]' ? collBtn : null } });

  const ax = env.toggleButtons.find((b) => b.dataset.filter === 'faction' && b.dataset.value === 'AX');
  const ly = env.toggleButtons.find((b) => b.dataset.filter === 'faction' && b.dataset.value === 'LY');
  env.root.dispatch('click', { target: { closest: (s) => s === '.filter-toggle[data-filter]' ? ax : null } });
  env.root.dispatch('click', { target: { closest: (s) => s === '.filter-toggle[data-filter]' ? ly : null } });

  eq(cs.filters.faction, ['AX', 'LY'], 'collection scope supports multi-select factions');
  const url = cs.buildCollApiUrl(1);
  ok(url.includes('cardSet[]=CORE') && url.includes('cardSet[]=ALIZE'), 'collection API URL sends default sets when untouched');
}

// 5. buildPageUrl & restoreFromUrl preserve format, costRelation, bannedOrSuspended, and default rarities
{
  const env = setupEnv();
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', uniquesApiBase: 'http://localhost:8005',
    defaults: { factions: [], types: ['CHARACTER'], rarities: ['COMMON', 'RARE'], sets: ['CORE'] },
  });
  cs.setFormat('frontier');
  cs.filters.costRelation = 'main_gt';
  cs.filters.bannedOrSuspended = true;
  const pageUrl = cs.buildPageUrl(1);
  ok(pageUrl.includes('format=frontier'), 'buildPageUrl includes format');
  ok(pageUrl.includes('costRelation=main_gt'), 'buildPageUrl includes costRelation');
  ok(pageUrl.includes('bannedOrSuspended=true'), 'buildPageUrl includes bannedOrSuspended');

  cs.resetFilters();
  cs.restoreFromUrl('?tab=unique&format=frontier&mainCost=2');
  ok(cs.getTab() === 'unique', 'restoreFromUrl restores tab=unique');
  ok(cs.filters.format === 'frontier', 'restoreFromUrl restores format=frontier');
  ok(cs.filters.mainCost === '2', 'restoreFromUrl restores mainCost');
  const fBtn = env.toggleButtons.find((b) => b.dataset.filter === 'format' && b.dataset.value === 'frontier');
  ok(fBtn.classList.contains('active'), 'restoreFromUrl activates Frontier format button');

  cs.restoreFromUrl('?q=kelon');
  eq(cs.filters.rarity, ['COMMON', 'RARE'], 'restoreFromUrl keeps default rarities when rarity[] omitted');
}

console.log(`\n${pass} passed`);
