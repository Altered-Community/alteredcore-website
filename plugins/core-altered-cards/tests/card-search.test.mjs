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

// 2. Tab switch resets user filters and applies target tab defaults (restoring defaults on return)
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
  ok(cs.filters.mainCost === null, 'mainCost reset across tab switch');
  ok(cs.filters.q === '', 'search query reset across tab switch');
  ok(cs.filters.sets.includes('COREKS'), 'COREKS added automatically on unique tab');

  const allBtn = env.tabButtons.find((b) => b.dataset.tab === 'all');
  env.root.dispatch('click', { target: { closest: (s) => s === '.cs-tab[data-tab]' ? allBtn : null } });

  ok(cs.getTab() === 'all', 'switched back to all tab');
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

// 6. buildUniquesApiUrl maps sort keys cleanly and omits random/default
{
  const env = setupEnv();
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', uniquesApiBase: 'http://localhost:8005', lang: 'fr',
    defaults: { factions: [], types: ['CHARACTER'], rarities: ['UNIQUE'], sets: ['CORE'], sort1: 'set_date_desc' },
  });
  cs.filters.sort = 'default';
  ok(cs.buildUniquesApiUrl(null).includes('sort=setDate%3Adesc'), 'default resolves via sort1 to setDate:desc');
  cs.filters.sort = 'name_asc';
  ok(cs.buildUniquesApiUrl(null).includes('sort=name%3Afr%3Aasc'), 'name_asc uses active lang');
  cs.filters.sort = 'number_desc';
  ok(cs.buildUniquesApiUrl(36).includes('cursor=36') && cs.buildUniquesApiUrl(36).includes('sort=reference%3Adesc'), 'cursor + reference:desc combined');
  cs.filters.sort = 'random';
  ok(!cs.buildUniquesApiUrl(null).includes('sort='), 'random sort omitted from uniques API URL');
}

// 7. numUniquesParts clamps values > 15 cleanly and uniques URL includes subTypes, costRelation, hasNoEffect, matchCount
{
  const env = setupEnv();
  const fcEl = { textContent: '', style: { display: '' } };
  env.byId.set('cs-filter-count', fcEl);
  const effectRows = [
    { _tsInsts: [{ getValue: () => ['24'] }, { getValue: () => [] }, { getValue: () => ['3'] }] },
    { _tsInsts: [{ getValue: () => ['24'] }, { getValue: () => [] }, { getValue: () => [] }] },
  ];
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', uniquesApiBase: 'http://localhost:8005', lang: 'en',
    defaults: { factions: [], types: ['CHARACTER'], rarities: ['COMMON', 'RARE'], sets: ['CORE'] },
  });
  env.byId.set('cs-effect-rows', {
    querySelectorAll: (sel) => (sel === '.effect-row' ? effectRows : []),
  });
  eq(cs.numUniquesParts('mainCost', '20'), ['mainCost[gt]=15'], 'exact > 15 maps to mainCost[gt]=15 (0 results, not 400)');
  eq(cs.numUniquesParts('mainCost', '13-20'), ['mainCost[]=13', 'mainCost[]=14', 'mainCost[]=15'], 'range clamps upper bound to 15');
  eq(cs.numUniquesParts('mainCost', '2,20'), ['mainCost[]=2'], 'list drops values > 15');
  eq(cs.numUniquesParts('mainCost', '<20'), ['mainCost[lte]=15'], 'upper bound > 15 clamps to <= 15 on /api/v2/search');

  cs.filters.subtypes = ['ELEMENTAL', 'ROBOT'];
  cs.filters.costRelation = 'main_gt';
  cs.filters.hasNoEffect = true;
  const uUrl = cs.buildUniquesApiUrl(null);
  ok(uUrl.includes('subTypes[]=ELEMENTAL') && uUrl.includes('subTypes[]=ROBOT'), 'uniques URL includes subTypes[]');
  ok(uUrl.includes('costRelation=mainHigher'), 'uniques URL translates costRelation=main_gt -> mainHigher');
  ok(uUrl.includes('hasNoEffect=true'), 'uniques URL includes hasNoEffect=true');
  ok(!uUrl.includes('effect[0][matchCount]='), 'narrower block does not require matchCount=2');
  ok(uUrl.includes('effect[1][matchCount]=2'), 'covering block gets matchCount=2');

  cs.filters.costRelation = 'eq';
  ok(cs.buildUniquesApiUrl(null).includes('costRelation=equal'), 'costRelation=eq -> equal');
  cs.filters.costRelation = 'recall_gt';
  ok(cs.buildUniquesApiUrl(null).includes('costRelation=recallHigher'), 'costRelation=recall_gt -> recallHigher');

  // Switch to unique tab and confirm forced defaults + unsupported filters don't inflate badge count
  env.byId.delete('cs-effect-rows');
  const uniqBtn = env.tabButtons.find((b) => b.dataset.tab === 'unique');
  env.root.dispatch('click', { target: { closest: (s) => s === '.cs-tab[data-tab]' ? uniqBtn : null } });
  cs.filters.keywords = ['FLEETING'];
  cs.filters.isBanned = true;
  cs.filters.subtypes = ['ELEMENTAL'];
  cs.updateFilterCount();
  ok(fcEl.textContent === 1, 'unique badge counts only supported filters (got ' + fcEl.textContent + ')');
}

// 8. mana/setDate sorting (order[setDate]), collection typesMerged expansion, and unique URL extra sets
{
  setupEnv();
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', apiBase: 'https://cards.alteredcore.org', collApiUrl: '/papi/coll',
    uniqueExtraSets: ['COREKS'],
    typesMerged: { LANDMARK_PERMANENT: ['PERMANENT', 'LANDMARK_PERMANENT'], TOKEN: ['TOKEN', 'TOKEN_LANDMARK_PERMANENT'] },
    defaults: { factions: ['AX'], types: ['CHARACTER'], rarities: ['COMMON', 'RARE'], sets: ['CORE', 'ALIZE'], sort1: 'set_date_desc', sort2: 'num_asc' },
  });

  cs.filters.sort = 'mana_desc';
  const manaUrl = cs.buildApiUrl(1);
  ok(manaUrl.includes('order[mainCost]=desc'), 'mana_desc sorts primarily by mainCost desc');
  ok(manaUrl.includes('order[setDate]=desc') && !manaUrl.includes('order[set.date]'), 'mana_desc tie-breaker uses order[setDate]=desc (not order[set.date])');

  cs.filters.sort = 'reserve_desc';
  const recallUrl = cs.buildApiUrl(1);
  ok(recallUrl.includes('order[recallCost]=desc') && recallUrl.includes('order[setDate]=desc') && !recallUrl.includes('order[set.date]'), 'reserve_desc uses order[setDate]=desc tie-breaker');

  setupEnv();
  const csColl = CardSearch({
    prefix: 'cs', mode: 'cards', apiBase: 'https://cards.alteredcore.org', collApiUrl: '/papi/coll',
    typesMerged: { LANDMARK_PERMANENT: ['PERMANENT', 'LANDMARK_PERMANENT'], TOKEN: ['TOKEN', 'TOKEN_LANDMARK_PERMANENT'] },
    defaults: { factions: ['AX'], types: ['CHARACTER'], rarities: ['COMMON'], sets: ['CORE'] },
  });
  csColl.restoreFromUrl('?tab=collection&type[]=LANDMARK_PERMANENT');
  const collUrl = csColl.buildCollApiUrl(1);
  ok(collUrl.includes('cardType[]=PERMANENT') && collUrl.includes('cardType[]=LANDMARK_PERMANENT'), 'collection URL expands typesMerged for LANDMARK_PERMANENT');

  cs.resetFilters();
  cs.restoreFromUrl('?tab=unique');
  ok(cs.filters.sets.includes('COREKS'), 'restoreFromUrl(?tab=unique) adds uniqueExtraSets (COREKS) when set[] omitted');
}

// 9. Unified /api/v2/search routing on all tab when uniquesApiBase is configured
{
  const env = setupEnv();
  const countEl = { textContent: '' };
  env.byId.set('cs-count', countEl);
  const cs = CardSearch({
    prefix: 'cs', mode: 'cards', apiBase: 'https://cards.alteredcore.org', uniquesApiBase: 'http://localhost:8005', lang: 'fr',
    typesMerged: { LANDMARK_PERMANENT: ['PERMANENT', 'LANDMARK_PERMANENT'], TOKEN: ['TOKEN', 'TOKEN_LANDMARK_PERMANENT'] },
    defaults: { factions: ['AX'], types: ['CHARACTER'], rarities: ['COMMON', 'RARE', 'EXALTED'], sets: ['CORE', 'ALIZE'], sort1: 'set_date_desc' },
  });

  cs.filters.sort = 'mana_asc';
  const uManaUrl = cs.buildApiUrl(2);
  ok(uManaUrl.startsWith('http://localhost:8005/api/v2/search?'), 'all tab routes to /api/v2/search when uniquesApiBase is set');
  ok(uManaUrl.includes('page=2') && uManaUrl.includes('limit=30') && uManaUrl.includes('sort=mainCost%3Aasc'), 'unified URL sends page, limit and mainCost:asc sort');
  ok(uManaUrl.includes('rarity[]=COMMON') && uManaUrl.includes('rarity[]=RARE') && uManaUrl.includes('rarity[]=EXALTED'), 'unified URL preserves default C/R/E rarities');

  cs.filters.sort = 'name_asc';
  cs.filters.keywords = ['FUGACE', 'RAVITAILLEZ_EPUISE'];
  cs.filters.variations = ['standard', 'alt-art', 'kickstarter'];
  cs.filters.costRelation = 'main_gt';
  const uKwUrl = cs.buildApiUrl(1);
  ok(uKwUrl.includes('sort=name%3Afr%3Aasc'), 'unified URL maps name_asc with active lang');
  ok(uKwUrl.includes('keywords[]=FLEETING') && uKwUrl.includes('keywords[]=RESUPPLY') && uKwUrl.includes('keywordMode=and'), 'unified URL maps French keyword codes and keywordMode=and');
  ok(uKwUrl.includes('variation[]=standard') && uKwUrl.includes('variation[]=alt-art') && !uKwUrl.includes('kickstarter'), 'unified URL forwards variations without kickstarter');
  ok(uKwUrl.includes('costRelation=mainHigher'), 'unified URL maps costRelation=main_gt -> mainHigher');

  cs.filters.q = 'alt_core_b_ax_01_c';
  const refUrl = cs.buildApiUrl(1);
  ok(refUrl.startsWith('http://localhost:8005/api/v2/search?ref[]=ALT_CORE_B_AX_01_C'), 'ALT_ ref lookup routes to /api/v2/search?ref[]=');

  cs.filters.q = '';
  {
    const env2 = setupEnv();
    const cs2 = CardSearch({
      prefix: 'cs', mode: 'cards', apiBase: 'https://cards.alteredcore.org', uniquesApiBase: 'http://localhost:8005', lang: 'fr',
      defaults: { factions: ['AX'], types: ['CHARACTER'], rarities: ['COMMON', 'RARE', 'EXALTED'], sets: ['CORE', 'ALIZE'], sort1: 'set_date_desc' },
    });
    cs2.filters.isBanned = true;
    const bannedUniUrl = cs2.buildApiUrl(1);
    ok(bannedUniUrl.includes('rarity[]=COMMON') && bannedUniUrl.includes('isBanned=true'), 'status flag preserves default C/R/E rarities on /api/v2/search');
  }

  globalThis.fetch = (url) => {
    env.fetches.push(url);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ iter: { total: 42 }, cards: [{ reference: 'ALT_CORE_B_AX_01_C', name: { fr_FR: 'Sierra & Oddball' } }] }),
    });
  };
  cs.search(1);
  await new Promise((r) => setTimeout(r, 10));
  ok(String(countEl.textContent).includes('42'), 'search() parses iter.total from /api/v2/search response');
}

console.log(`\n${pass} passed`);
